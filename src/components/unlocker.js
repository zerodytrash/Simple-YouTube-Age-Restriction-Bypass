import * as innertube from "./innertubeClient";
import * as inspector from "./inspector";
import * as logger from "../utils/logger";
import * as proxy from "./proxy";
import Notification from "./notification";
import { isDesktop } from "../utils";

const messagesMap = {
    success: "Age-restricted video successfully unlocked!",
    fail: "Unable to unlock this video 🙁 - More information in the developer console",
};

const unlockStrategies = [
    // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube API
    // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
    {
        name: 'Innertube Embed',
        requireAuth: false,
        fn: (videoId) => innertube.getPlayer(videoId, { clientScreen: 'EMBED' }, false)
    },
    // Strategy 2: Retrieve the video info by using the WEB_CREATOR client in combination with user authentication
    // See https://github.com/yt-dlp/yt-dlp/pull/600
    {
        name: 'Innertube Creator + Auth',
        requireAuth: true,
        fn: (videoId) => innertube.getPlayer(videoId, { clientName: 'WEB_CREATOR', clientVersion: '1.20210909.07.00' }, true)
    },
    // Strategy 3: Retrieve the video info from an account proxy server.
    // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
    {
        name: 'Account Proxy',
        requireAuth: false,
        fn: (videoId, reason) => proxy.getPlayer(videoId, reason)
    }
];

let lastProxiedGoogleVideoUrlParams;
let responseCache = {};

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get("id");
}

export function unlockPlayerResponse(playerResponse) {
    const videoId = playerResponse.videoDetails?.videoId || innertube.getYtcfgValue("PLAYER_VARS").video_id;
    const reason = playerResponse.playabilityStatus?.status || playerResponse.previewPlayabilityStatus?.status;
    const unlockedPlayerResponse = getUnlockedPlayerResponse(videoId, reason);

    // account proxy error?
    if (unlockedPlayerResponse.errorMessage) {
        Notification.show(`${messagesMap.fail} (ProxyError)`, 10)
        throw new Error(`Player Unlock Failed, Proxy Error Message: ${unlockedPlayerResponse.errorMessage}`);
    }

    // check if the unlocked response isn't playable
    if (unlockedPlayerResponse.playabilityStatus?.status !== "OK") {
        Notification.show(`${messagesMap.fail} (PlayabilityError)`, 10);
        throw new Error(`Player Unlock Failed, playabilityStatus: ${unlockedPlayerResponse.playabilityStatus?.status}`);
    }

    // if the video info was retrieved via proxy, store the URL params from the url-attribute to detect later if the requested video file (googlevideo.com) need a proxy.
    if (unlockedPlayerResponse.proxied && unlockedPlayerResponse.streamingData?.adaptiveFormats) {
        const cipherText = unlockedPlayerResponse.streamingData.adaptiveFormats.find(x => x.signatureCipher)?.signatureCipher;
        const videoUrl = cipherText ? new URLSearchParams(cipherText).get("url") : unlockedPlayerResponse.streamingData.adaptiveFormats.find(x => x.url)?.url;

        lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
    }

    // Overwrite the embedded (preview) playabilityStatus with the unlocked one
    if (playerResponse.previewPlayabilityStatus) {
        playerResponse.previewPlayabilityStatus = unlockedPlayerResponse.playabilityStatus;
    }

    // Transfer all unlocked properties to the original player response
    Object.assign(playerResponse, unlockedPlayerResponse);

    Notification.show(messagesMap.success);
}

function getUnlockedPlayerResponse(videoId, reason) {
    // Check if response is cached
    if (responseCache.videoId === videoId) return responseCache.playerResponse;

    let playerResponse;

    unlockStrategies.every((strategy, index) => {
        if(strategy.requireAuth && !innertube.isUserLoggedIn()) return true;

        logger.info(`Trying Unlock Method #${index + 1} (${strategy.name})`);
        
        playerResponse = strategy.fn(videoId, reason);
        return playerResponse?.playabilityStatus?.status !== "OK";
    });

    // Cache response
    responseCache = { videoId, playerResponse };

    return playerResponse;
}

export function unlockNextResponse(originalNextResponse) {
    logger.info("Trying Sidebar Unlock Method (Innertube Embed)");

    const { videoId, playlistId, index: playlistIndex } = originalNextResponse.currentVideoEndpoint.watchEndpoint;
    const unlockedNextResponse = innertube.getNext(videoId, { clientScreen: 'EMBED' }, playlistId, playlistIndex);

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
        const originalVideoSecondaryInfoRenderer = originalNextResponse.contents.twoColumnWatchNextResults.results.results.contents
            .find(x => x.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer;
        const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents.twoColumnWatchNextResults.results.results.contents
            .find(x => x.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer;

        if (unlockedVideoSecondaryInfoRenderer.description)
            originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

        return;
    }

    // Transfer WatchNextResults to original response
    const unlockedWatchNextFeed = unlockedNextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.itemSectionRenderer?.targetId === "watch-next-feed");

    if (unlockedWatchNextFeed)
        originalNextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);

    // Transfer video description to original response
    const originalStructuredDescriptionContentRenderer = originalNextResponse.engagementPanels
        .find(x => x.engagementPanelSectionListRenderer).engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items
        .find(x => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        .find(x => x.engagementPanelSectionListRenderer).engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items
        .find(x => x.expandableVideoDescriptionBodyRenderer);

    if (unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer)
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;
}
