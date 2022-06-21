import * as Config from './config';
import * as interceptors from './components/interceptors';
import * as inspectors from './components/inspectors';
import * as unlocker from './components/unlocker';
import * as thumbnailFix from './components/thumbnailFix';
import * as storage from './components/storage';
import * as logger from './utils/logger';
import { proxy } from './components/endpoints';
import { isObject } from './utils';

try {
    interceptors.attachInitialDataInterceptor(processYtData);
    interceptors.attachJsonInterceptor(processYtData);
    interceptors.attachXhrOpenInterceptor(onXhrOpenCalled);
    interceptors.attachRequestInterceptor(onRequestCreate);
} catch (err) {
    logger.error(err, 'Error while attaching data interceptors');
}

function processYtData(ytData) {
    try {
        // Player Unlock #1: Initial page data structure and response from `/youtubei/v1/player` XHR request
        if (inspectors.player.isPlayerObject(ytData) && inspectors.player.isAgeRestricted(ytData.playabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        }
        // Player Unlock #2: Embedded Player inital data structure
        else if (inspectors.player.isEmbeddedPlayerObject(ytData) && inspectors.player.isAgeRestricted(ytData.previewPlayabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        }
    } catch (err) {
        logger.error(err, 'Video unlock failed');
    }

    try {
        // Unlock sidebar watch next feed (sidebar) and video description
        if (inspectors.next.isWatchNextObject(ytData) && inspectors.next.isWatchNextSidebarEmpty(ytData)) {
            unlocker.unlockNextResponse(ytData);
        }

        // Mobile version
        if (inspectors.next.isWatchNextObject(ytData.response) && inspectors.next.isWatchNextSidebarEmpty(ytData.response)) {
            unlocker.unlockNextResponse(ytData.response);
        }
    } catch (err) {
        logger.error(err, 'Sidebar unlock failed');
    }

    try {
        // Unlock blurry video thumbnails in search results
        if (inspectors.search.isSearchResult(ytData)) {
            thumbnailFix.processThumbnails(ytData);
        }
    } catch (err) {
        logger.error(err, 'Thumbnail unlock failed');
    }

    return ytData;
}

function onXhrOpenCalled(method, url, xhr) {
    let proxyUrl = unlockGoogleVideo(url);
    if (proxyUrl) {
        // Exclude credentials from XMLHttpRequest Request
        Object.defineProperty(xhr, 'withCredentials', {
            set: () => {},
            get: () => false,
        });
        return proxyUrl;
    }

    if (url.pathname.indexOf('/youtubei/') === 0) {
        // Store auth headers in storage for further usage.
        interceptors.attachGenericInterceptor(xhr, 'setRequestHeader', (headerName, headerValue) => {
            if (Config.GOOGLE_AUTH_HEADER_NAMES.includes(headerName)) {
                storage.set(headerName, headerValue);
            }
        });
    }

    if (method === 'POST' && ['/youtubei/v1/player', '/youtubei/v1/next'].includes(url.pathname)) {
        // Add content check flags to player and next request (this will skip content warnings)
        interceptors.attachGenericInterceptor(xhr, 'send', (data) => {
            if (typeof data === 'string') {
                arguments[0] = setContentCheckOk(data);
            }
        });
    }
}

function onRequestCreate(url, requestOptions) {
    let newGoogleVideoUrl = unlockGoogleVideo(url);
    if (newGoogleVideoUrl) {
        // Exclude credentials from Fetch Request
        if (requestOptions.credentials) {
            requestOptions.credentials = 'omit';
        }
        return newGoogleVideoUrl;
    }

    if (url.pathname.indexOf('/youtubei/') === 0 && isObject(requestOptions.headers)) {
        // Store auth headers in authStorage for further usage.
        for (let headerName in requestOptions.headers) {
            if (Config.GOOGLE_AUTH_HEADER_NAMES.includes(headerName)) {
                storage.set(headerName, requestOptions.headers[headerName]);
            }
        }
    }

    if (['/youtubei/v1/player', '/youtubei/v1/next'].includes(url.pathname)) {
        // Add content check flags to player and next request (this will skip content warnings)
        requestOptions.body = setContentCheckOk(requestOptions.body);
    }
}

function unlockGoogleVideo(url) {
    if (Config.VIDEO_PROXY_SERVER_HOST && inspectors.googlevideo.isGoogleVideoUrl(url)) {
        // If the account proxy was used to retrieve the video info, the following applies:
        // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
        // to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
        // this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...

        if (inspectors.googlevideo.isGoogleVideoUnlockRequired(url, unlocker.getLastProxiedGoogleVideoId())) {
            return proxy.getGoogleVideoUrl(url);
        }
    }
}

function setContentCheckOk(bodyJson) {
    try {
        let parsedBody = JSON.parse(bodyJson);
        if (parsedBody.videoId) {
            parsedBody.contentCheckOk = true;
            parsedBody.racyCheckOk = true;
            return JSON.stringify(parsedBody);
        }
        return bodyJson;
    } catch {
        return bodyJson;
    }
}
