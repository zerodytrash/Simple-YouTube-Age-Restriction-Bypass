import * as Config from "./config"
import * as interceptor from "./components/interceptor";
import * as inspector from "./components/inspector";
import * as unlocker from "./components/unlocker";
import * as proxy from "./components/proxy";

interceptor.attachInititalDataInterceptor(checkAndUnlock);
interceptor.attachJsonInterceptor(checkAndUnlock);
interceptor.attachXhrOpenInterceptor(onXhrOpenCalled);

function checkAndUnlock(ytData) {
    return inspector.inspectYtData(
            ytData,
            (playerObject) => unlocker.unlockPlayerResponse(playerObject),
            (nextObject) => unlocker.unlockNextResponse(nextObject)
        );
}

// Intercept XMLHttpRequest.open to rewrite video URL's (sometimes required)
function onXhrOpenCalled(xhr, method, url, urlParams) {
    if(!Config.VIDEO_PROXY_SERVER_HOST || !inspector.isGoogleVideoUnlockRequired(method, url, urlParams, unlocker.getLastProxiedGoogleVideoId())) return;

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
