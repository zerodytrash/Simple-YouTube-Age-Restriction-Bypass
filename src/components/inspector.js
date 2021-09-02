import * as innertubeClient from "./innertubeClient";
import * as Config from "../config"

export function inspectYtData(ytData, onPlayerUnlockRequired, onNextUnlockRequired) {
    // If YouTube does JSON.parse(null) or similar weird things
    if (typeof ytData !== "object" || ytData === null) return ytData;

    try {
        // Unlock #1: Array based in "&pbj=1" AJAX response on any navigation (does not seem to be used anymore)
        if (Array.isArray(ytData)) {
            const { playerResponse } = ytData.find(e => typeof e.playerResponse === "object") || {};

            if (playerResponse && isAgeRestricted(playerResponse.playabilityStatus)) {
                playerResponseArrayItem.playerResponse = onPlayerUnlockRequired(playerResponse);

                const { response: nextResponse } = ytData.find(e => typeof e.response === "object") || {};

                if (isWatchNextObject(nextResponse) && !innertubeClient.getConfig().LOGGED_IN && isWatchNextSidebarEmpty(nextResponse.contents)) {
                    nextResponseArrayItem.response = onNextUnlockRequired(nextResponse);
                }
            }
        }

        // Unlock #2: Another JSON-Object containing the 'playerResponse' (seems to be used by m.youtube.com with &pbj=1)
        if (ytData.playerResponse?.playabilityStatus && ytData.playerResponse?.videoDetails && isAgeRestricted(ytData.playerResponse.playabilityStatus)) {
            ytData.playerResponse = onPlayerUnlockRequired(ytData.playerResponse);
        }

        // Unlock #3: Initial page data structure and response from the '/youtubei/v1/player' endpoint
        if (ytData.playabilityStatus && ytData.videoDetails && isAgeRestricted(ytData.playabilityStatus)) {
            ytData = onPlayerUnlockRequired(ytData);
        }

        // Equivelant of unlock #2 for sidebar/next response
        if (isWatchNextObject(ytData.response) && !innertubeClient.getConfig().LOGGED_IN && isWatchNextSidebarEmpty(ytData.response.contents)) {
            ytData.response = onNextUnlockRequired(ytData.response);
        }

        // Equivelant of unlock #3 for sidebar/next response
        if (isWatchNextObject(ytData) && !innertubeClient.getConfig().LOGGED_IN && isWatchNextSidebarEmpty(ytData.contents)) {
            ytData = onNextUnlockRequired(ytData)
        }
    } catch (err) {
        console.error("Simple-YouTube-Age-Restriction-Bypass-Error:", err, "You can report bugs at: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues");
    }

    return ytData;
}

function isAgeRestricted(playabilityStatus) {
    if (!playabilityStatus?.status) return false;
    return !!playabilityStatus.desktopLegacyAgeGateReason || Config.UNLOCKABLE_PLAYER_STATES.includes(playabilityStatus.status);
}

function isWatchNextObject(parsedData) {
    if (!parsedData?.contents || !parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
}

export function isWatchNextSidebarEmpty(contents) {
    const secondaryResults = contents.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
    if (secondaryResults?.results) return false;

    // MWEB response layout
    const singleColumnWatchNextContents = contents.singleColumnWatchNextResults?.results?.results?.contents;
    if (!singleColumnWatchNextContents) return true;

    const { itemSectionRenderer } = singleColumnWatchNextContents.find(e => e.itemSectionRenderer?.targetId === "watch-next-feed") || {};

    return !!itemSectionRenderer;
}

export function isGoogleVideoUnlockRequired(method, url, urlParams, lastProxiedGoogleVideoId) {

    function isGoogleVideo() {
        return method === "GET" && url.host.indexOf(".googlevideo.com") > 0;
    }

    function hasGcrFlag() {
        return urlParams.get("gcr") !== null;
    }

    function isUnlockedByAccountProxy() {
        return urlParams.get("id") !== null && urlParams.get("id") === lastProxiedGoogleVideoId;
    }

    return isGoogleVideo() && hasGcrFlag() && isUnlockedByAccountProxy()
}