import * as Config from "../config"

export function isPlayerObject(parsedData) {
    return parsedData?.videoDetails && parsedData?.playabilityStatus;
}

export function isAgeRestricted(playabilityStatus) {
    if (!playabilityStatus?.status) return false;
    return !!playabilityStatus.desktopLegacyAgeGateReason || Config.UNLOCKABLE_PLAYER_STATES.includes(playabilityStatus.status);
}

export function isWatchNextObject(parsedData) {
    if (!parsedData?.contents || !parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
}

export function isWatchNextSidebarEmpty(contents) {

    // WEB response layout
    const secondaryResults = contents.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
    if (secondaryResults?.results) return false;

    // MWEB response layout
    const singleColumnWatchNextContents = contents.singleColumnWatchNextResults?.results?.results?.contents;
    if (!singleColumnWatchNextContents) return true;

    const itemSectionRenderer = singleColumnWatchNextContents.find(e => e.itemSectionRenderer?.targetId === "watch-next-feed")?.itemSectionRenderer;

    return typeof itemSectionRenderer !== "object";
}

export function isGoogleVideo(method, url) {
    return method === "GET" && url.host.indexOf(".googlevideo.com") > 0;
}

export function isGoogleVideoUnlockRequired(googleVideoUrl, lastProxiedGoogleVideoId) {
    const urlParams = new URLSearchParams(googleVideoUrl.search);
    const hasGcrFlag = urlParams.get("gcr") !== null;
    const wasUnlockedByAccountProxy = urlParams.get("id") !== null && urlParams.get("id") === lastProxiedGoogleVideoId;

    return hasGcrFlag && wasUnlockedByAccountProxy
}
