import * as innertubeClient from "./innertubeClient";
import * as proxy from "./proxy";
import Notification from "./notification";

const messagesMap = {
    success: "Video successfully unlocked!",
    fail: "Unable to unlock this video 🙁 - More information in the developer console",
};

let lastProxiedGoogleVideoUrlParams;
let responseCache = {};

export function unlockPlayerResponse(playerResponse) {
    const videoId = playerResponse.videoDetails.videoId;
    const reason = playerResponse.playabilityStatus?.status;
    const unlockedPayerResponse = getUnlockedPlayerResponse(videoId, reason);

    const cfg = innertubeClient.getConfig();
    const innerTubeDebug = `innertubeApiKey: ${cfg.INNERTUBE_API_KEY}`
        + `innertubeClientName: ${cfg.INNERTUBE_CLIENT_NAME}`
        + `innertubeClientVersion: ${cfg.INNERTUBE_CLIENT_VERSION}`;

    // account proxy error?
    if (unlockedPayerResponse.errorMessage) {
        Notification.show(`${messagesMap.fail} (ProxyError)`, 10)
        throw new Error(`Unlock Failed, errorMessage:${unlockedPayerResponse.errorMessage}; ${innerTubeDebug}`);
    }

    // check if the unlocked response isn't playable
    if (unlockedPayerResponse.playabilityStatus?.status !== "OK") {
        Notification.show(`${messagesMap.fail} (PlayabilityError)`, 10);
        throw new Error(`Unlock Failed, playabilityStatus: ${unlockedPayerResponse.playabilityStatus?.status} ${innerTubeDebug}`);
    }

    // if the video info was retrieved via proxy, store the URL params from the url- or signatureCipher-attribute to detect later if the requested video files are from this unlock.
    // => see isUnlockedByAccountProxy()
    if (unlockedPayerResponse.proxied && unlockedPayerResponse.streamingData?.adaptiveFormats) {
        const cipherText = unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.signatureCipher)?.signatureCipher;
        const videoUrl = cipherText ? new URLSearchParams(cipherText).get("url") : unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.url)?.url;

        lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
    }

    Notification.show(messagesMap.success);

    return unlockedPayerResponse;
}

export function unlockNextResponse(nextResponse) {
    const { videoId, playlistId, index: playlistIndex } = nextResponse.currentVideoEndpoint.watchEndpoint;
    const unlockedNextResponse = getUnlockedNextResponse(videoId, playlistId, playlistIndex);

    // check if the unlocked response's sidebar is still empty
    if (isWatchNextSidebarEmpty(unlockedNextResponse.contents)) {
        throw new Error(`Sidebar Unlock Failed, innertubeApiKey:${innertubeClient.getConfig().INNERTUBE_API_KEY}; innertubeClientName:${innertubeClient.getConfig().INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${innertubeClient.getConfig().INNERTUBE_CLIENT_VERSION}`);
    }

    // Transfer WatchNextResults to original response
    if (nextResponse.contents?.twoColumnWatchNextResults?.secondaryResults) {
        nextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse?.contents?.twoColumnWatchNextResults?.secondaryResults;
    }

    // Transfer mobile (MWEB) WatchNextResults to original response
    if (nextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents) {
        const unlockedWatchNextFeed = unlockedNextResponse?.contents?.singleColumnWatchNextResults?.results?.results?.contents
            ?.find(x => x.itemSectionRenderer?.targetId === "watch-next-feed");
        if (unlockedWatchNextFeed) nextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);
    }

    // Transfer video description to original response
    const originalVideoSecondaryInfoRenderer = nextResponse.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
    const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;

    if (originalVideoSecondaryInfoRenderer && unlockedVideoSecondaryInfoRenderer?.description)
        originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

    // Transfer mobile (MWEB) video description to original response
    const originalStructuredDescriptionContentRenderer = nextResponse.engagementPanels
        ?.find(x => x.engagementPanelSectionListRenderer)?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
        ?.find(x => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        ?.find(x => x.engagementPanelSectionListRenderer)?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
        ?.find(x => x.expandableVideoDescriptionBodyRenderer);

    if (originalStructuredDescriptionContentRenderer && unlockedStructuredDescriptionContentRenderer?.expandableVideoDescriptionBodyRenderer)
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;

    return nextResponse;
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
        console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Unlock Method #1 (Innertube Embed)");
        return innertubeClient.getPlayer(videoId)
    }

    // Strategy 2: Retrieve the video info from an account proxy server.
    // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
    function useProxy() {
        console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Unlock Method #2 (Account Proxy)");
        return proxy.getPlayerFromAccountProxy(videoId, reason);
    }
}

function getUnlockedNextResponse(videoId, playlistId, playlistIndex) {
    // Retrieve the sidebar by using a age-gate bypass for the innertube API
    console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Sidebar Unlock Method (Innertube Embed)");
    return innertubeClient.getNext(videoId, playlistId, playlistIndex)
}

export function getLastProxiedGoogleVideoId() {
    return lastProxiedGoogleVideoUrlParams?.get("id");
}
