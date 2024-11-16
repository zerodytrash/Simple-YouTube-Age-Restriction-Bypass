import * as config from '../../config.js';
import * as logger from '../../logger.js';
import { createDeepCopy, getSignatureTimestamp, getYtcfgValue, isEmbed, isUserLoggedIn } from '../../utils.js';
import innertube from '../innertube.js';
import { isConfirmationRequired, requestConfirmation } from '../ui/errorScreen.js';
import Toast from '../ui/toast.js';

const messagesMap = {
    success: 'Age-restricted video successfully unlocked!',
    fail: 'Unable to unlock this video 🙁 - More information in the developer console',
};

const UNLOCKABLE_PLAYABILITY_STATUSES = ['AGE_VERIFICATION_REQUIRED', 'AGE_CHECK_REQUIRED', 'CONTENT_CHECK_REQUIRED', 'LOGIN_REQUIRED'];
const VALID_PLAYABILITY_STATUSES = ['OK', 'LIVE_STREAM_OFFLINE'];

export let lastPlayerUnlockVideoId = null;
export let lastPlayerUnlockReason = null;

let lastProxiedGoogleVideoUrlParams;
let cachedPlayerResponse = {};

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get('id');
}

export function unlockResponse(playerResponse) {
    // Check if the user has to confirm the unlock first
    if (isConfirmationRequired()) {
        logger.info('Unlock confirmation required.');
        requestConfirmation();
        return;
    }

    const videoId = playerResponse.videoDetails?.videoId || getYtcfgValue('PLAYER_VARS').video_id;
    const reason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;

    if (!config.SKIP_CONTENT_WARNINGS && reason.includes('CHECK_REQUIRED')) {
        logger.info(`SKIP_CONTENT_WARNINGS disabled and ${reason} status detected.`);
        return;
    }

    lastPlayerUnlockVideoId = videoId;
    lastPlayerUnlockReason = reason;

    const unlockedPlayerResponse = getUnlockedPlayerResponse(videoId, reason);

    // check if the unlocked response isn't playable
    if (!VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse.playabilityStatus?.status)) {
        Toast.show(`${messagesMap.fail} (PlayabilityError)`, 10);
        throw new Error(`Player Unlock Failed, playabilityStatus: ${unlockedPlayerResponse.playabilityStatus?.status}`);
    }

    // Overwrite the embedded (preview) playabilityStatus with the unlocked one
    if (playerResponse.previewPlayabilityStatus) {
        playerResponse.previewPlayabilityStatus = unlockedPlayerResponse.playabilityStatus;
    }

    // Transfer all unlocked properties to the original player response
    Object.assign(playerResponse, unlockedPlayerResponse);

    Toast.show(messagesMap.success);

    return true;
}

function getUnlockedPlayerResponse(videoId, reason) {
    // Check if response is cached
    if (cachedPlayerResponse.videoId === videoId) return createDeepCopy(cachedPlayerResponse);

    const unlockStrategies = getUnlockStrategies(videoId, reason);

    let unlockedPlayerResponse = {};

    for (const strategy of unlockStrategies) {
        if (strategy.skip) continue;

        // Skip strategy if authentication is required and the user is not logged in
        if (strategy.requiresAuth && !isUserLoggedIn()) continue;

        logger.info(`Trying Player Unlock Method ${strategy.name}`);

        try {
            unlockedPlayerResponse = strategy.endpoint.getPlayer(strategy.payload, strategy.requiresAuth || strategy.optionalAuth);
        } catch (err) {
            logger.error(`Player unlock Method "${strategy.name}" failed with exception:`, err);
        }

        const isStatusValid = VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse?.playabilityStatus?.status);

        if (isStatusValid) {
            /**
             * Workaround: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/191
             *
             * YouTube checks if the `trackingParams` in the response matches the decoded `trackingParam` in `responseContext.mainAppWebResponseContext`.
             * However, sometimes the response does not include the `trackingParam` in the `responseContext`, causing the check to fail.
             *
             * This workaround addresses the issue by hardcoding the `trackingParams` in the response context.
             */
            if (!unlockedPlayerResponse.trackingParams || !unlockedPlayerResponse.responseContext?.mainAppWebResponseContext?.trackingParam) {
                unlockedPlayerResponse.trackingParams = 'CAAQu2kiEwjor8uHyOL_AhWOvd4KHavXCKw=';
                unlockedPlayerResponse.responseContext = {
                    mainAppWebResponseContext: {
                        trackingParam: 'kx_fmPxhoPZRzgL8kzOwANUdQh8ZwHTREkw2UqmBAwpBYrzRgkuMsNLBwOcCE59TDtslLKPQ-SS',
                    },
                };
            }

            // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
            cachedPlayerResponse = { videoId, ...createDeepCopy(unlockedPlayerResponse) };

            return unlockedPlayerResponse;
        }
    }
}

export function isPlayerObject(parsedData) {
    return (parsedData?.videoDetails && parsedData?.playabilityStatus) || typeof parsedData?.previewPlayabilityStatus === 'object';
}

export function isAgeRestricted(ytData) {
    const playabilityStatus = ytData.previewPlayabilityStatus ?? ytData.playabilityStatus;

    if (!playabilityStatus?.status) return false;
    if (playabilityStatus.desktopLegacyAgeGateReason) return true;
    if (UNLOCKABLE_PLAYABILITY_STATUSES.includes(playabilityStatus.status)) return true;

    // Fix to detect age restrictions on embed player
    // see https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/85#issuecomment-946853553
    return (
        isEmbed
        && playabilityStatus.errorScreen?.playerErrorMessageRenderer?.reason?.runs?.find((x) => x.navigationEndpoint)?.navigationEndpoint?.urlEndpoint?.url?.includes('/2802167')
    );
}

function getCurrentVideoStartTime(currentVideoId) {
    // Check if the URL corresponds to the requested video
    // This is not the case when the player gets preloaded for the next video in a playlist.
    if (window.location.href.includes(currentVideoId)) {
        // "t"-param on youtu.be urls
        // "start"-param on embed player
        // "time_continue" when clicking "watch on youtube" on embedded player
        const urlParams = new URLSearchParams(window.location.search);
        const startTimeString = (urlParams.get('t') || urlParams.get('start') || urlParams.get('time_continue'))?.replace('s', '');

        if (startTimeString && !isNaN(startTimeString)) {
            return parseInt(startTimeString);
        }
    }

    return 0;
}

function getUnlockStrategies(videoId, reason) {
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const signatureTimestamp = getSignatureTimestamp();
    const startTimeSecs = getCurrentVideoStartTime(videoId);
    const hl = getYtcfgValue('HL');

    return [
        /**
         * Retrieve the video info by just adding `racyCheckOk` and `contentCheckOk` params
         * This strategy can be used to bypass content warnings
         */
        {
            name: 'Content Warning Bypass',
            skip: !reason || !reason.includes('CHECK_REQUIRED'),
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
    ];
}
