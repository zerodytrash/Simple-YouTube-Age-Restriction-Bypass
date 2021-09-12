import * as Config from "./config"
import * as interceptor from "./components/interceptor";
import * as inspector from "./components/inspector";
import * as unlocker from "./components/unlocker";
import * as proxy from "./components/proxy";
import * as logger from "./utils/logger";

// This is just a state variable to handle age-restrictions in YouTube's embedded player.
let isAgeRestrictedEmbeddedPlayer = false;

try {
    interceptor.attachInitialDataInterceptor(checkAndUnlock);
    interceptor.attachJsonInterceptor(checkAndUnlock);
    interceptor.attachXhrOpenInterceptor(onXhrOpenCalled);
} catch (err) {
    logger.error(err, "Error while attaching data interceptors");
}

function checkAndUnlock(ytData) {

    try {

        // Unlock #1: Initial page data structure and response from the '/youtubei/v1/player' endpoint
        if (inspector.isPlayerObject(ytData) && inspector.isAgeRestricted(ytData.playabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        }
        // Unlock #2: Legacy response data structure (only used by m.youtube.com with &pbj=1)
        else if (inspector.isPlayerObject(ytData.playerResponse) && inspector.isAgeRestricted(ytData.playerResponse.playabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData.playerResponse);
        }
        // Unlock #3: Embedded Player inital data structure
        else if (inspector.isEmbeddedPlayerObject(ytData) && inspector.isAgeRestricted(ytData.previewPlayabilityStatus)) {
            isAgeRestrictedEmbeddedPlayer = true;
            unlocker.unlockPlayerResponse(ytData);
        }
        // Unlock #4: Embedded Player response data structure (has no age-restriction indicator, therefore we use a state variable)
        else if (inspector.isPlayerObject(ytData) && inspector.isUnplayable(ytData.playabilityStatus) && isAgeRestrictedEmbeddedPlayer) {
            isAgeRestrictedEmbeddedPlayer = false;
            unlocker.unlockPlayerResponse(ytData);
        }
        // Equivelant of unlock #1 for sidebar/next response
        else if (inspector.isWatchNextObject(ytData) && inspector.isWatchNextSidebarEmpty(ytData)) {
            unlocker.unlockNextResponse(ytData);
        }
        // Equivelant of unlock #2 for sidebar/next response
        else if (inspector.isWatchNextObject(ytData.response) && inspector.isWatchNextSidebarEmpty(ytData.response)) {
            unlocker.unlockNextResponse(ytData.response);
        }

    } catch (err) {
        logger.error(err, "Video or sidebar unlock failed");
    }

    return ytData;
}

function onXhrOpenCalled(xhr, method, url) {

    if (!Config.VIDEO_PROXY_SERVER_HOST || !inspector.isGoogleVideo(method, url)) return;

    if (inspector.isGoogleVideoUnlockRequired(url, unlocker.getLastProxiedGoogleVideoId())) {

        // If the account proxy was used to retrieve the video info, the following applies:
        // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
        // to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
        // this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...

        // solve CORS errors by preventing YouTube from enabling the "withCredentials" option (required for the proxy)
        Object.defineProperty(xhr, "withCredentials", {
            set: () => { },
            get: () => false,
        });

        return proxy.getGoogleVideoUrl(url.toString(), Config.VIDEO_PROXY_SERVER_HOST);
    }
}
