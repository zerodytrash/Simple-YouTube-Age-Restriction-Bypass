import * as Config from '../config';
import * as logger from '../utils/logger';
import Toast from './toast';
import { innertube, proxy } from './endpoints';
import { isEmbed, isConfirmed, createDeepCopy, getCurrentVideoStartTime, getYtcfgValue, getSignatureTimestamp, isUserLoggedIn } from '../utils';
import { isConfirmationRequired, requestConfirmation } from './confirmation';

const messagesMap = {
    success: 'Age-restricted video successfully unlocked!',
    fail: 'Unable to unlock this video 🙁 - More information in the developer console',
};

export let lastPlayerUnlockReason = null;

let lastProxiedGoogleVideoUrlParams;
let cachedPlayerResponse = {};

function getPlayerUnlockStrategies(playerResponse) {
    const videoId = playerResponse.videoDetails?.videoId || getYtcfgValue('PLAYER_VARS').video_id;
    const reason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const signatureTimestamp = getSignatureTimestamp();
    const startTimeSecs = getCurrentVideoStartTime(videoId);
    const hl = getYtcfgValue('HL');

    lastPlayerUnlockReason = reason;

    return [
        /**
         * Retrieve the video info by just adding `racyCheckOk` and `contentCheckOk` params
         * This strategy can be used to bypass content warnings
         */
        {
            name: 'Content Warning Bypass',
            skip: reason && !reason.includes('CHECK_REQUIRED'),
            optionalAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: clientName,
                        clientVersion: clientVersion,
                        hl,
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
                startTimeSecs,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the video info by using the TVHTML5 Embedded client
         * This client has no age restrictions in place (2022-03-28)
         * See https://github.com/zerodytrash/YouTube-Internal-Clients
         */
        {
            name: 'TV Embedded Player',
            requiresAuth: false,
            payload: {
                context: {
                    client: {
                        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
                        clientVersion: '2.0',
                        clientScreen: 'WATCH',
                        hl,
                    },
                    thirdParty: {
                        embedUrl: 'https://www.youtube.com/',
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
                startTimeSecs,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the video info by using the WEB_CREATOR client in combination with user authentication
         * Requires that the user is logged in. Can bypass the tightened age verification in the EU.
         * See https://github.com/yt-dlp/yt-dlp/pull/600
         */
        {
            name: 'Creator + Auth',
            requiresAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: 'WEB_CREATOR',
                        clientVersion: '1.20210909.07.00',
                        hl,
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
                startTimeSecs,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the video info from an account proxy server.
         * Session cookies of an age-verified Google account are stored on server side.
         * See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
         */
        {
            name: 'Account Proxy',
            payload: {
                videoId,
                reason,
                clientName,
                clientVersion,
                signatureTimestamp,
                startTimeSecs,
                hl,
                isEmbed: +isEmbed,
                isConfirmed: +isConfirmed,
            },
            endpoint: proxy,
        },
    ];
}

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get('id');
}

export function unlockPlayerResponse(playerResponse) {
    // Check if the user has to confirm the unlock first
    if (isConfirmationRequired()) {
        logger.info('Unlock confirmation required.');
        requestConfirmation();
        return playerResponse;
    }

    const unlockedPlayerResponse = getUnlockedPlayerResponse(playerResponse);

    // account proxy error?
    if (unlockedPlayerResponse.errorMessage) {
        Toast.show(`${messagesMap.fail} (ProxyError)`, 10);
        throw new Error(`Player Unlock Failed, Proxy Error Message: ${unlockedPlayerResponse.errorMessage}`);
    }

    // check if the unlocked response isn't playable
    if (!Config.VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse.playabilityStatus?.status)) {
        Toast.show(`${messagesMap.fail} (PlayabilityError)`, 10);
        throw new Error(`Player Unlock Failed, playabilityStatus: ${unlockedPlayerResponse.playabilityStatus?.status}`);
    }

    // if the video info was retrieved via proxy, store the URL params from the url-attribute to detect later if the requested video file (googlevideo.com) need a proxy.
    if (unlockedPlayerResponse.proxied && unlockedPlayerResponse.streamingData?.adaptiveFormats) {
        const cipherText = unlockedPlayerResponse.streamingData.adaptiveFormats.find((x) => x.signatureCipher)?.signatureCipher;
        const videoUrl = cipherText ? new URLSearchParams(cipherText).get('url') : unlockedPlayerResponse.streamingData.adaptiveFormats.find((x) => x.url)?.url;

        lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new window.URL(videoUrl).search) : null;
    }

    // Overwrite the embedded (preview) playabilityStatus with the unlocked one
    if (playerResponse.previewPlayabilityStatus) {
        playerResponse.previewPlayabilityStatus = unlockedPlayerResponse.playabilityStatus;
    }

    // Transfer all unlocked properties to the original player response
    Object.assign(playerResponse, unlockedPlayerResponse);

    playerResponse.unlocked = true;

    Toast.show(messagesMap.success);
}

function getUnlockedPlayerResponse(playerResponse) {
    const videoId = playerResponse.videoDetails?.videoId || getYtcfgValue('PLAYER_VARS').video_id;

    // Check if response is cached
    if (cachedPlayerResponse.videoId === videoId) return createDeepCopy(cachedPlayerResponse);

    const unlockStrategies = getPlayerUnlockStrategies(playerResponse);

    let unlockedPlayerResponse = {};

    // Try every strategy until one of them works
    unlockStrategies.every((strategy, index) => {
        // Skip strategy if authentication is required and the user is not logged in
        if (strategy.skip || (strategy.requiresAuth && !isUserLoggedIn())) return true;

        logger.info(`Trying Player Unlock Method #${index + 1} (${strategy.name})`);

        try {
            unlockedPlayerResponse = strategy.endpoint.getPlayer(strategy.payload, strategy.requiresAuth || strategy.optionalAuth);
        } catch (err) {
            logger.error(err, `Player Unlock Method ${index + 1} failed with exception`);
        }

        return !Config.VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse?.playabilityStatus?.status);
    });

    // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
    cachedPlayerResponse = { videoId, ...createDeepCopy(unlockedPlayerResponse) };

    return unlockedPlayerResponse;
}
