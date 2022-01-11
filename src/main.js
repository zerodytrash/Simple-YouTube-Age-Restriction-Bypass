import * as Config from './config';
import * as interceptor from './components/interceptor';
import * as inspector from './components/inspector';
import * as unlocker from './components/unlocker';
import * as thumbnailFix from './components/thumbnailFix';
import * as proxy from './components/proxy';
import * as logger from './utils/logger';

try {
    interceptor.attachInitialDataInterceptor(processYtData);
    interceptor.attachJsonInterceptor(processYtData);
    interceptor.attachXhrOpenInterceptor(onXhrOpenCalled);
} catch (err) {
    logger.error(err, 'Error while attaching data interceptors');
}

function processYtData(ytData) {
    tryFeatureUnlock(() => {
        // Player Unlock #1: Initial page data structure and response from `/youtubei/v1/player` XHR request
        if (inspector.isPlayerObject(ytData) && inspector.isAgeRestricted(ytData.playabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        }
        // Player Unlock #2: Embedded Player inital data structure
        else if (inspector.isEmbeddedPlayerObject(ytData) && inspector.isAgeRestricted(ytData.previewPlayabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        }
    }, 'Video unlock failed');

    tryFeatureUnlock(() => {
        // Unlock sidebar watch next feed (sidebar) and video description
        if (inspector.isWatchNextObject(ytData) && inspector.isWatchNextSidebarEmpty(ytData)) {
            unlocker.unlockNextResponse(ytData);
        }

        // Mobile version
        if (inspector.isWatchNextObject(ytData.response) && inspector.isWatchNextSidebarEmpty(ytData.response)) {
            unlocker.unlockNextResponse(ytData.response);
        }
    }, 'Sidebar unlock failed');

    tryFeatureUnlock(() => {
        // Unlock blurry video thumbnails in search results
        if (inspector.isSearchResult(ytData)) {
            thumbnailFix.processThumbnails(ytData);
        }
    }, 'Thumbnail unlock failed');

    return ytData;
}

function tryFeatureUnlock(fn, errorMsg) {
    try {
        fn();
    } catch (err) {
        logger.error(err, errorMsg);
    }
}

function onXhrOpenCalled(xhr, method, url) {
    if (!Config.VIDEO_PROXY_SERVER_HOST || !inspector.isGoogleVideo(method, url)) return;

    if (inspector.isGoogleVideoUnlockRequired(url, unlocker.getLastProxiedGoogleVideoId())) {
        // If the account proxy was used to retrieve the video info, the following applies:
        // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
        // to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
        // this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...

        // solve CORS errors by preventing YouTube from enabling the "withCredentials" option (required for the proxy)
        Object.defineProperty(xhr, 'withCredentials', {
            set: () => {},
            get: () => false,
        });

        return proxy.getGoogleVideoUrl(url.toString());
    }
}
