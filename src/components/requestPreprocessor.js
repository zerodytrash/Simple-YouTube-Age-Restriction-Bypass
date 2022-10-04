import Config from '../config';
import * as storage from './storage';
import * as interceptors from './interceptors';
import * as inspectors from './inspectors';
import * as unlocker from './unlocker';
import { proxy } from './endpoints';
import { isObject } from '../utils';

/**
 *  Handles XMLHttpRequests and
 * - Rewrite Googlevideo URLs to Proxy URLs (if necessary)
 * - Store auth headers for the authentication of further unlock requests.
 * - Add "content check ok" flags to request bodys
 */
export function handleXhrOpen(method, url, xhr) {
    let proxyUrl = unlockGoogleVideo(url);
    if (proxyUrl) {
        // Exclude credentials from XMLHttpRequest
        Object.defineProperty(xhr, 'withCredentials', {
            set: () => {},
            get: () => false,
        });
        return proxyUrl;
    }

    if (url.pathname.indexOf('/youtubei/') === 0) {
        // Store auth headers in storage for further usage.
        interceptors.attachGenericInterceptor(xhr, 'setRequestHeader', ([headerName, headerValue]) => {
            if (Config.GOOGLE_AUTH_HEADER_NAMES.includes(headerName)) {
                storage.set(headerName, headerValue);
            }
        });
    }

    if (Config.SKIP_CONTENT_WARNINGS && method === 'POST' && ['/youtubei/v1/player', '/youtubei/v1/next'].includes(url.pathname)) {
        // Add content check flags to player and next request (this will skip content warnings)
        interceptors.attachGenericInterceptor(xhr, 'send', (args) => {
            if (typeof args[0] === 'string') {
                args[0] = setContentCheckOk(args[0]);
            }
        });
    }
}

/**
 *  Handles Fetch requests and
 * - Rewrite Googlevideo URLs to Proxy URLs (if necessary)
 * - Store auth headers for the authentication of further unlock requests.
 * - Add "content check ok" flags to request bodys
 */
export function handleFetchRequest(url, requestOptions) {
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

    if (Config.SKIP_CONTENT_WARNINGS && ['/youtubei/v1/player', '/youtubei/v1/next'].includes(url.pathname)) {
        // Add content check flags to player and next request (this will skip content warnings)
        requestOptions.body = setContentCheckOk(requestOptions.body);
    }
}

/**
 * If the account proxy was used to retrieve the video info, the following applies:
 * some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
 * to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
 * this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...
 * @returns The rewitten url (if a proxy is required)
 */
function unlockGoogleVideo(url) {
    if (Config.VIDEO_PROXY_SERVER_HOST && inspectors.googlevideo.isGoogleVideoUrl(url)) {
        if (inspectors.googlevideo.isGoogleVideoUnlockRequired(url, unlocker.getLastProxiedGoogleVideoId())) {
            return proxy.getGoogleVideoUrl(url);
        }
    }
}

/**
 * Adds `contentCheckOk` and `racyCheckOk` to the given json data (if the data contains a video id)
 * @returns {string} The modified json
 */
function setContentCheckOk(bodyJson) {
    try {
        let parsedBody = JSON.parse(bodyJson);
        if (parsedBody.videoId) {
            parsedBody.contentCheckOk = true;
            parsedBody.racyCheckOk = true;
            return JSON.stringify(parsedBody);
        }
    } catch {}
    return bodyJson;
}
