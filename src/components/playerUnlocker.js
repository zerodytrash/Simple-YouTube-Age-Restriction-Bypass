import * as Config from '../config';
import * as innertube from './innertubeClient';
import * as logger from '../utils/logger';
import * as proxy from './proxy';
import Toast from './toast';
import { isEmbed, isConfirmed, createDeepCopy, getCurrentVideoStartTime } from '../utils';
import { isConfirmationRequired, requestConfirmation } from './confirmation';

const messagesMap = {
    success: 'Age-restricted video successfully unlocked!',
    fail: 'Unable to unlock this video 🙁 - More information in the developer console',
};

let lastProxiedGoogleVideoUrlParams;
let cachedPlayerResponse = {};

function getPlayerUnlockStrategies(playerResponse) {
    const videoId = playerResponse.videoDetails?.videoId || innertube.getYtcfgValue('PLAYER_VARS').video_id;
    const reason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;
    const clientName = innertube.getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = innertube.getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const signatureTimestamp = innertube.getSignatureTimestamp();
    const startTimeSecs = getCurrentVideoStartTime(videoId);
    const hl = innertube.getYtcfgValue('HL');

    return [
        // Strategy 1: Retrieve the video info by using the WEB_EMBEDDED_PLAYER client
        // Only usable to bypass login restrictions on a handful of low restricted videos (Tier 1).
        // See https://github.com/yt-dlp/yt-dlp/pull/575#issuecomment-888837000
        {
            name: 'Embedded Player',
            requiresAuth: false,
            skip: clientName === 'WEB_EMBEDDED_PLAYER',
            payload: {
                context: {
                    client: {
                        clientName: 'WEB_EMBEDDED_PLAYER',
                        clientVersion: '1.20220220.00.00',
                        clientScreen: 'EMBED',
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
            getPlayer: innertube.getPlayer,
        },
        // Strategy 2: Retrieve the video info by using the WEB_CREATOR client in combination with user authentication
        // Requires that the user is logged in. Can bypass the tightened age verification in the EU.
        // See https://github.com/yt-dlp/yt-dlp/pull/600
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
            getPlayer: innertube.getPlayer,
        },
        // Strategy 3: Retrieve the video info from an account proxy server.
        // Session cookies of an age-verified Google account are stored on server side.
        // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
        {
            name: 'Account Proxy',
            requiresAuth: false,
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
            getPlayer: proxy.getPlayer,
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

        lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
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
    const videoId = playerResponse.videoDetails?.videoId || innertube.getYtcfgValue('PLAYER_VARS').video_id;

    // Check if response is cached
    if (cachedPlayerResponse.videoId === videoId) return createDeepCopy(cachedPlayerResponse);

    const unlockStrategies = getPlayerUnlockStrategies(playerResponse);

    let unlockedPlayerResponse = {};

    // Try every strategy until one of them works
    unlockStrategies.every((strategy, index) => {
        // Skip if flag set
        if (strategy.skip) return true;

        // Skip strategy if authentication is required and the user is not logged in
        if (strategy.requiresAuth && !innertube.isUserLoggedIn()) return true;

        logger.info(`Trying Player Unlock Method #${index + 1} (${strategy.name})`);

        try {
            unlockedPlayerResponse = strategy.getPlayer(strategy.payload, strategy.requiresAuth);
        } catch (err) {
            logger.error(err, `Player Unlock Method ${index + 1} failed with exception`);
        }

        return !Config.VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse?.playabilityStatus?.status);
    });

    // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
    cachedPlayerResponse = { videoId, ...createDeepCopy(unlockedPlayerResponse) };

    return unlockedPlayerResponse;
}
