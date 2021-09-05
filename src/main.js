import * as Config from "./config"
import * as innertubeClient from "./components/innertubeClient";
import * as interceptor from "./components/interceptor";
import * as inspector from "./components/inspector";
import * as unlocker from "./components/unlocker";
import * as proxy from "./components/proxy";
import * as logger from "./utils/logger";

try {
    interceptor.attachInitialDataInterceptor(checkAndUnlock);
    interceptor.attachJsonInterceptor(checkAndUnlock);
    interceptor.attachXhrOpenInterceptor(onXhrOpenCalled);
} catch(err) {
    logger.error(err);
}

function checkAndUnlock(ytData) {
    try {
        // Unlock #1: Another JSON-Object containing the 'playerResponse' (seems to be used by m.youtube.com with &pbj=1)
        if (ytData.playerResponse?.playabilityStatus && ytData.playerResponse?.videoDetails && inspector.isAgeRestricted(ytData.playerResponse.playabilityStatus)) {
            ytData.playerResponse = unlocker.unlockPlayerResponse(ytData.playerResponse);
        }

        // Unlock #2: Initial page data structure and response from the '/youtubei/v1/player' endpoint
        if (ytData.playabilityStatus && ytData.videoDetails && inspector.isAgeRestricted(ytData.playabilityStatus)) {
            ytData = unlocker.unlockPlayerResponse(ytData);
        }

        // Equivelant of unlock #1 for sidebar/next response
        if (inspector.isWatchNextObject(ytData.response) && !innertubeClient.isUserLoggedIn() && inspector.isWatchNextSidebarEmpty(ytData.response.contents)) {
            ytData.response = unlocker.unlockNextResponse(ytData.response);
        }

        // Equivelant of unlock #2 for sidebar/next response
        if (inspector.isWatchNextObject(ytData) && !innertubeClient.isUserLoggedIn() && inspector.isWatchNextSidebarEmpty(ytData.contents)) {
            ytData = unlocker.unlockNextResponse(ytData)
        }
    } catch (err) {
        logger.error(err);
    }

    return ytData;
}

function onXhrOpenCalled(xhr, method, url) {

    if (!Config.VIDEO_PROXY_SERVER_HOST || !inspector.isGoogleVideo(method, url)) return;

    if (inspector.isGoogleVideoUnlockRequired(url, unlocker.getLastProxiedGoogleVideoId())) {

        // If the account proxy was used to retieve the video info, the following applies:
        // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
        // to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
        // this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...

        // solve CORS errors by preventing YouTube from enabling the "withCredentials" option (not required for the proxy)
        Object.defineProperty(xhr, "withCredentials", {
            set: () => { },
            get: () => false,
        });

        return proxy.getProxiedGooglevideoUrl(url.toString(), Config.VIDEO_PROXY_SERVER_HOST);
    }
}
