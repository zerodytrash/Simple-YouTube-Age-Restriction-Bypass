import * as Config from '../config';
import * as innertube from './innertubeClient';
import * as inspector from './inspector';
import * as logger from '../utils/logger';
import * as proxy from './proxy';
import Toast from './toast';
import { isDesktop, isEmbed, createDeepCopy } from '../utils';

const messagesMap = {
    success: 'Age-restricted video successfully unlocked!',
    fail: 'Unable to unlock this video 🙁 - More information in the developer console',
};

let lastProxiedGoogleVideoUrlParams;
let cachedPlayerResponse = {};

function getUnlockStrategies(playerResponse) {
    const videoId = playerResponse.videoDetails?.videoId || innertube.getYtcfgValue('PLAYER_VARS').video_id;
    const reason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;
    const clientName = innertube.getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = innertube.getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const signatureTimestamp = innertube.getSignatureTimestamp();

    return [
        // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube API
        // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
        {
            name: 'Embed',
            requiresAuth: false,
            payload: {
                context: {
                    client: {
                        clientName,
                        clientVersion,
                        clientScreen: 'EMBED',
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
            },
            getPlayer: innertube.getPlayer,
        },
        // Strategy 2: Retrieve the video info by using the WEB_CREATOR client in combination with user authentication
        // See https://github.com/yt-dlp/yt-dlp/pull/600
        {
            name: 'Creator + Auth',
            requiresAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: 'WEB_CREATOR',
                        clientVersion: '1.20210909.07.00',
                        thirdParty: {
                            embedUrl: 'https://www.youtube.com/',
                        },
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
            },
            getPlayer: innertube.getPlayer,
        },
        // Strategy 3: Retrieve the video info from an account proxy server.
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
                isEmbed: +isEmbed,
            },
            getPlayer: proxy.getPlayer,
        },
    ];
}

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get('id');
}

export function unlockPlayerResponse(playerResponse) {
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

    const unlockStrategies = getUnlockStrategies(playerResponse);

    let unlockedPlayerResponse;

    // Try every strategy until one of them works
    unlockStrategies.every((strategy, index) => {
        // Skip strategy if authentication is required and the user is not logged in
        if (strategy.requiresAuth && !innertube.isUserLoggedIn()) return true;

        logger.info(`Trying Unlock Method #${index + 1} (${strategy.name})`);

        unlockedPlayerResponse = strategy.getPlayer(strategy.payload, strategy.requiresAuth);

        return !Config.VALID_PLAYABILITY_STATUSES.includes(unlockedPlayerResponse?.playabilityStatus?.status);
    });

    // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
    cachedPlayerResponse = { videoId, ...createDeepCopy(unlockedPlayerResponse) };

    return unlockedPlayerResponse;
}

export function unlockNextResponse(originalNextResponse) {
    logger.info('Trying sidebar unlock');

    const { videoId } = originalNextResponse.currentVideoEndpoint.watchEndpoint;
    const { clientName, clientVersion } = innertube.getYtcfgValue('INNERTUBE_CONTEXT').client;
    const payload = {
        context: {
            client: {
                clientName,
                clientVersion,
                clientScreen: 'EMBED',
            },
            thirdParty: {
                embedUrl: 'https://www.youtube.com/',
            },
        },
        videoId,
    };

    const unlockedNextResponse = innertube.getNext(payload);

    // check if the sidebar of the unlocked response is still empty
    if (inspector.isWatchNextSidebarEmpty(unlockedNextResponse)) {
        throw new Error(`Sidebar Unlock Failed`);
    }

    // Transfer some parts of the unlocked response to the original response
    mergeNextResponse(originalNextResponse, unlockedNextResponse);
}

function mergeNextResponse(originalNextResponse, unlockedNextResponse) {
    if (isDesktop) {
        // Transfer WatchNextResults to original response
        originalNextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse.contents.twoColumnWatchNextResults.secondaryResults;

        // Transfer video description to original response
        const originalVideoSecondaryInfoRenderer = originalNextResponse.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x) => x.videoSecondaryInfoRenderer
        ).videoSecondaryInfoRenderer;
        const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x) => x.videoSecondaryInfoRenderer
        ).videoSecondaryInfoRenderer;

        if (unlockedVideoSecondaryInfoRenderer.description) originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

        return;
    }

    // Transfer WatchNextResults to original response
    const unlockedWatchNextFeed = unlockedNextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents?.find(
        (x) => x.itemSectionRenderer?.targetId === 'watch-next-feed'
    );

    if (unlockedWatchNextFeed) originalNextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);

    // Transfer video description to original response
    const originalStructuredDescriptionContentRenderer = originalNextResponse.engagementPanels
        .find((x) => x.engagementPanelSectionListRenderer)
        .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find((x) => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        .find((x) => x.engagementPanelSectionListRenderer)
        .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find((x) => x.expandableVideoDescriptionBodyRenderer);

    if (unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer)
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;
}
