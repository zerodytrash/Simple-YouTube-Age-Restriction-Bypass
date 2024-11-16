// Leave config on top
import './config.js';
import * as thumbnailFix from './components/thumbnailFix.js';
import * as nextUnlocker from './components/unlocker/next.js';
import * as playerUnlocker from './components/unlocker/player.js';
import * as config from './config.js';
import * as logger from './logger.js';
import { createDeepCopy, GOOGLE_AUTH_HEADER_NAMES } from './utils.js';

/**
 * And here we deal with YouTube's crappy initial data (present in page source) and the problems that occur when intercepting that data.
 * YouTube has some protections in place that make it difficult to intercept and modify the global ytInitialPlayerResponse variable.
 * The easiest way would be to set a descriptor on that variable to change the value directly on declaration.
 * But some adblockers define their own descriptors on the ytInitialPlayerResponse variable, which makes it hard to register another descriptor on it.
 * As a workaround only the relevant playerResponse property of the ytInitialPlayerResponse variable will be intercepted.
 * This is achieved by defining a descriptor on the object prototype for that property, which affects any object with a `playerResponse` property.
 */
interceptObjectProperty('playerResponse', (obj, playerResponse) => {
    logger.info(`playerResponse property set, contains sidebar: ${!!obj.response}`);

    // The same object also contains the sidebar data and video description
    if (obj.response) processYtData(obj.response);

    // If the script is executed too late and the bootstrap data has already been processed,
    // a reload of the player can be forced by creating a deep copy of the object.
    // This is especially relevant if the userscript manager does not handle the `@run-at document-start` correctly.
    return processYtData(playerResponse) ? createDeepCopy(playerResponse) : playerResponse;
});

// The global `ytInitialData` variable can be modified on the fly.
// It contains search results, sidebar data and meta information
// Not really important but fixes https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/127
window.addEventListener('DOMContentLoaded', () => {
    if (window.ytInitialData) {
        processYtData(window.ytInitialData);
    }
});

JSON.parse = new Proxy(JSON.parse, {
    construct(target, args) {
        const data = Reflect.construct(target, args);
        processYtData(data);
        return data;
    },
});

XMLHttpRequest.prototype.open = new Proxy(XMLHttpRequest.prototype.open, {
    construct(target, args) {
        const [method, url] = args;
        try {
            if (typeof url === 'string' && url.indexOf('https://') !== -1) {
                handleXhrOpen(method, url, this);
            }
        } catch (err) {
            logger.error(err, `Failed to intercept XMLHttpRequest.open()`);
        }

        return Reflect.construct(target, args);
    },
});

Request = new Proxy(Request, {
    construct(target, args) {
        const [url, options] = args;
        try {
            if (typeof url === 'string' && url.indexOf('https://') !== -1) {
                handleFetchRequest(url, options);
            }
        } catch (err) {
            logger.error(err, `Failed to intercept Request()`);
        }

        return Reflect.construct(target, args);
    },
});

function processYtData(ytData) {
    try {
        if (playerUnlocker.isPlayerObject(ytData) && playerUnlocker.isAgeRestricted(ytData)) {
            return playerUnlocker.unlockResponse(ytData);
        }
    } catch (err) {
        logger.error(err, 'Video unlock failed');
    }

    try {
        if (nextUnlocker.isWatchNextObject(ytData) && nextUnlocker.isWatchNextSidebarEmpty(ytData)) {
            nextUnlocker.unlockResponse(ytData);
        }
    } catch (err) {
        logger.error(err, 'Sidebar unlock failed');
    }

    try {
        // Unlock blurry video thumbnails in search results
        if (isSearchResult(ytData)) {
            thumbnailFix.processThumbnails(ytData);
        }
    } catch (err) {
        logger.error(err, 'Thumbnail unlock failed');
    }
}

function interceptObjectProperty(prop, onSet) {
    // Allow other userscripts to decorate this descriptor, if they do something similar
    const dataKey = '__SYARB_' + prop;
    const { get: getter, set: setter } = Object.getOwnPropertyDescriptor(Object.prototype, prop) ?? {
        set(value) {
            this[dataKey] = value;
        },
        get() {
            return this[dataKey];
        },
    };

    // Intercept the given property on any object
    // The assigned attribute value and the context (enclosing object) are passed to the onSet function.
    Object.defineProperty(Object.prototype, prop, {
        set(value) {
            setter.call(this, value ? onSet(this, value) : value);
        },
        get() {
            return getter.call(this);
        },
        configurable: true,
    });
}

function isSearchResult(parsedData) {
    return (
        typeof parsedData?.contents?.twoColumnSearchResultsRenderer === 'object' // Desktop initial results
        || parsedData?.contents?.sectionListRenderer?.targetId === 'search-feed' // Mobile initial results
        || parsedData?.onResponseReceivedCommands?.find((x) => x.appendContinuationItemsAction)?.appendContinuationItemsAction?.targetId === 'search-feed' // Desktop & Mobile scroll continuation
    );
}

function attachGenericInterceptor(obj, prop, onCall) {
    if (!obj || typeof obj[prop] !== 'function') {
        return;
    }

    const original = obj[prop];

    obj[prop] = function(...args) {
        try {
            onCall(args);
        } catch {}
        original.apply(this, args);
    };
}

/**
 *  Handles XMLHttpRequests and
 * - Rewrite Googlevideo URLs to Proxy URLs (if necessary)
 * - Store auth headers for the authentication of further unlock requests.
 * - Add "content check ok" flags to request bodys
 */
function handleXhrOpen(method, url, xhr) {
    const url_obj = new URL(url);

    if (url_obj.pathname.startsWith('/youtubei/')) {
        // Store auth headers in storage for further usage.
        attachGenericInterceptor(xhr, 'setRequestHeader', ([key, value]) => {
            if (GOOGLE_AUTH_HEADER_NAMES.includes(key)) {
                localStorage.setItem('SYARB_' + key, JSON.stringify(value));
            }
        });
    }

    if (config.SKIP_CONTENT_WARNINGS && method === 'POST' && ['/youtubei/v1/player', '/youtubei/v1/next'].includes(url_obj.pathname)) {
        // Add content check flags to player and next request (this will skip content warnings)
        attachGenericInterceptor(xhr, 'send', (args) => {
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
function handleFetchRequest(url, requestOptions) {
    const url_obj = new URL(url);

    if (url_obj.pathname.startsWith('/youtubei/') && requestOptions.headers) {
        // Store auth headers in authStorage for further usage.
        for (const key in requestOptions.headers) {
            if (GOOGLE_AUTH_HEADER_NAMES.includes(key)) {
                localStorage.setItem('SYARB_' + key, JSON.stringify(requestOptions.headers[key]));
            }
        }
    }

    if (config.SKIP_CONTENT_WARNINGS && ['/youtubei/v1/player', '/youtubei/v1/next'].includes(url_obj.pathname)) {
        // Add content check flags to player and next request (this will skip content warnings)
        requestOptions.body = setContentCheckOk(requestOptions.body);
    }
}

/**
 * Adds `contentCheckOk` and `racyCheckOk` to the given json data (if the data contains a video id)
 * @returns {string} The modified json
 */
function setContentCheckOk(bodyJson) {
    try {
        const parsedBody = JSON.parse(bodyJson);
        if (parsedBody.videoId) {
            parsedBody.contentCheckOk = true;
            parsedBody.racyCheckOk = true;
            return JSON.stringify(parsedBody);
        }
    } catch {}
    return bodyJson;
}
