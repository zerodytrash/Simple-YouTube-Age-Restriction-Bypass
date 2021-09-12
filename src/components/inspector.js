import { isDesktop } from "../utils";
import * as Config from "../config"

export function isPlayerObject(parsedData) {
    return parsedData?.videoDetails && parsedData?.playabilityStatus;
}

export function isEmbeddedPlayerObject(parsedData) {
    return typeof parsedData?.previewPlayabilityStatus === "object";
}

export function isAgeRestricted(playabilityStatus) {
    if (!playabilityStatus?.status) return false;
    return !!playabilityStatus.desktopLegacyAgeGateReason || Config.UNLOCKABLE_PLAYER_STATES.includes(playabilityStatus.status);
}

export function isWatchNextObject(parsedData) {
    if (!parsedData?.contents || !parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
}

export function isUnplayable(playabilityStatus) {
    return playabilityStatus?.status === "UNPLAYABLE";
}

export function isWatchNextSidebarEmpty(parsedData) {
    if (isDesktop) {
        // WEB response layout
        const result = parsedData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results;
        return !result;
    }

    // MWEB response layout
    const content = parsedData.contents?.singleColumnWatchNextResults?.results?.results?.contents;
    const result = content?.find(e => e.itemSectionRenderer?.targetId === "watch-next-feed")?.itemSectionRenderer;
    return typeof result !== "object";
}

export function isGoogleVideo(method, url) {
    return method === "GET" && url.host.includes(".googlevideo.com");
}

export function isGoogleVideoUnlockRequired(googleVideoUrl, lastProxiedGoogleVideoId) {
    const urlParams = new URLSearchParams(googleVideoUrl.search);
    const hasGcrFlag = urlParams.get("gcr");
    const wasUnlockedByAccountProxy = urlParams.get("id") === lastProxiedGoogleVideoId;

    return hasGcrFlag && wasUnlockedByAccountProxy
}
