import * as Config from '../../config';
import * as logger from '../../utils/logger';
import Toast from '../toast';
import { getPlayerUnlockStrategies } from '../strategies';
import { createDeepCopy, getYtcfgValue, isUserLoggedIn } from '../../utils';
import { isConfirmationRequired, requestConfirmation } from '../confirmation';

const messagesMap = {
    success: 'Age-restricted video successfully unlocked!',
    fail: 'Unable to unlock this video 🙁 - More information in the developer console',
};

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

    lastPlayerUnlockReason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;

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
