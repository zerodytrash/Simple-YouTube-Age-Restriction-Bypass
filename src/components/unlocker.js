import * as innertubeClient from "./innertubeClient";
import * as inspector from "./inspector";
import * as logger from "../utils/logger";
import * as proxy from "./proxy";
import Notification from "./notification";

const messagesMap = {
    success: "Age-restricted video successfully unlocked!",
    fail: "Unable to unlock this video 🙁 - More information in the developer console",
};

let lastProxiedGoogleVideoUrlParams;
let responseCache = {};

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get("id");
}

export function unlockPlayerResponse(playerResponse) {
    const videoId = playerResponse.videoDetails.videoId;
    const reason = playerResponse.playabilityStatus?.status;
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

    // if the video info was retrieved via proxy, store the URL params from the url- or signatureCipher-attribute to detect later if the requested video files (googlevideo.com) are from this unlock.
    if (unlockedPlayerResponse.proxied && unlockedPlayerResponse.streamingData?.adaptiveFormats) {
        const cipherText = unlockedPlayerResponse.streamingData.adaptiveFormats.find(x => x.signatureCipher)?.signatureCipher;
        const videoUrl = cipherText ? new URLSearchParams(cipherText).get("url") : unlockedPlayerResponse.streamingData.adaptiveFormats.find(x => x.url)?.url;

        lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
    }

    Notification.show(messagesMap.success);

    return unlockedPlayerResponse;
}

function getUnlockedPlayerResponse(videoId, reason) {
    // Check if response is cached
    if (responseCache.videoId === videoId) return responseCache.playerResponse;

    let playerResponse = useInnertubeEmbed();

    if (playerResponse?.playabilityStatus?.status !== "OK") playerResponse = useProxy();

    // Cache response for 10 seconds
    responseCache = { videoId, playerResponse };
    setTimeout(() => { responseCache = {} }, 10000);

    return playerResponse;

    // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube API
    // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
    function useInnertubeEmbed() {
        logger.info("Trying Unlock Method #1 (Innertube Embed)");
        return innertubeClient.getPlayer(videoId)
    }

    // Strategy 2: Retrieve the video info from an account proxy server.
    // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
    function useProxy() {
        logger.info("Trying Unlock Method #2 (Account Proxy)");
        return proxy.getPlayerFromAccountProxy(videoId, reason);
    }
}

export function unlockNextResponse(originalNextResponse) {
    const { videoId, playlistId, index: playlistIndex } = originalNextResponse.currentVideoEndpoint.watchEndpoint;
    const unlockedNextResponse = getUnlockedNextResponse(videoId, playlistId, playlistIndex);

    // check if the sidebar of the unlocked response is still empty
    if (inspector.isWatchNextSidebarEmpty(unlockedNextResponse)) {
        throw new Error(`Sidebar Unlock Failed`);
    }

    // Transfer some parts of the unlocked response to the original response
    mergeNextResponse(originalNextResponse, unlockedNextResponse);

    return originalNextResponse;
}

function getUnlockedNextResponse(videoId, playlistId, playlistIndex) {
    // Retrieve the sidebar by using a age-gate bypass for the innertube API
    logger.info("Trying Sidebar Unlock Method (Innertube Embed)");
    return innertubeClient.getNext(videoId, playlistId, playlistIndex)
}

function mergeNextResponse(originalNextResponse, unlockedNextResponse) {
    // Transfer WatchNextResults to original response
    if (originalNextResponse.contents?.twoColumnWatchNextResults?.secondaryResults) {
        originalNextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse?.contents?.twoColumnWatchNextResults?.secondaryResults;
    }

    // Transfer mobile (MWEB) WatchNextResults to original response
    if (originalNextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents) {
        const unlockedWatchNextFeed = unlockedNextResponse?.contents?.singleColumnWatchNextResults?.results?.results?.contents
            ?.find(x => x.itemSectionRenderer?.targetId === "watch-next-feed");
        if (unlockedWatchNextFeed)
            originalNextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);
    }

    // Transfer video description to original response
    const originalVideoSecondaryInfoRenderer = originalNextResponse.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
    const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;

    if (originalVideoSecondaryInfoRenderer && unlockedVideoSecondaryInfoRenderer?.description)
        originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

    // Transfer mobile (MWEB) video description to original response
    const originalStructuredDescriptionContentRenderer = originalNextResponse.engagementPanels
        ?.find(x => x.engagementPanelSectionListRenderer)?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
        ?.find(x => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        ?.find(x => x.engagementPanelSectionListRenderer)?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
        ?.find(x => x.expandableVideoDescriptionBodyRenderer);

    if (originalStructuredDescriptionContentRenderer && unlockedStructuredDescriptionContentRenderer?.expandableVideoDescriptionBodyRenderer)
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;
}
