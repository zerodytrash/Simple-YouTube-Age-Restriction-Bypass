import Config from '../../config';
import { createDeepCopy, getYtcfgValue, isUserLoggedIn } from '../../utils';
import * as logger from '../../utils/logger';
import { isConfirmationRequired, requestConfirmation } from '../confirmation';
import { getPlayerUnlockStrategies } from '../strategies';
import Toast from '../toast';

const messagesMap = {
    success: 'Age-restricted video successfully unlocked!',
    fail: 'Unable to unlock this video 🙁 - More information in the developer console',
};

export let lastPlayerUnlockVideoId = null;
export let lastPlayerUnlockReason = null;

let lastProxiedGoogleVideoUrlParams;
let cachedPlayerResponse = {};

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get('id');
}

export default function unlockResponse(playerResponse) {
    // Check if the user has to confirm the unlock first
    if (isConfirmationRequired()) {
        logger.info('Unlock confirmation required.');
        requestConfirmation();
        return;
    }

    const videoId = playerResponse.videoDetails?.videoId || getYtcfgValue('PLAYER_VARS').video_id;
    const reason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;

    if (!Config.SKIP_CONTENT_WARNINGS && reason.includes('CHECK_REQUIRED')) {
        logger.info(`SKIP_CONTENT_WARNINGS disabled and ${reason} status detected.`);
        return;
    }

    lastPlayerUnlockVideoId = videoId;
    lastPlayerUnlockReason = reason;

    const unlockedPlayerResponse = getUnlockedPlayerResponse(videoId, reason);

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

function getUnlockedPlayerResponse(videoId, reason) {
    // Check if response is cached
    if (cachedPlayerResponse.videoId === videoId) return createDeepCopy(cachedPlayerResponse);

    const unlockStrategies = getPlayerUnlockStrategies(videoId, reason);

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

        const isStatusValid = Config.VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse?.playabilityStatus?.status);

        /**
         * Workaround: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/191
         *
         * YouTube checks if the `trackingParams` in the response matches the decoded `trackingParam` in `responseContext.mainAppWebResponseContext`.
         * However, sometimes the response does not include the `trackingParam` in the `responseContext`, causing the check to fail.
         *
         * This workaround addresses the issue by hardcoding the `trackingParams` in the response context.
         */
        if (isStatusValid && !unlockedPlayerResponse.trackingParams || !unlockedPlayerResponse.responseContext?.mainAppWebResponseContext?.trackingParam) {
            unlockedPlayerResponse.trackingParams = 'CAAQu2kiEwjor8uHyOL_AhWOvd4KHavXCKw=';
            unlockedPlayerResponse.responseContext = {
                mainAppWebResponseContext: {
                    trackingParam: 'kx_fmPxhoPZRzgL8kzOwANUdQh8ZwHTREkw2UqmBAwpBYrzRgkuMsNLBwOcCE59TDtslLKPQ-SS',
                },
            };
        }

        return !isStatusValid;
    });

    // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
    cachedPlayerResponse = { videoId, ...createDeepCopy(unlockedPlayerResponse) };

    return unlockedPlayerResponse;
}
