const UNLOCKABLE_PLAYER_STATES = ["AGE_VERIFICATION_REQUIRED", "AGE_CHECK_REQUIRED", "LOGIN_REQUIRED"];
const PLAYER_RESPONSE_ALIASES = ["ytInitialPlayerResponse", "playerResponse"];

// YouTube API config (Innertube).
// The actual values will be determined later from the global ytcfg variable => setInnertubeConfigFromYtcfg()
const INNERTUBE_CONFIG = {
    INNERTUBE_API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    INNERTUBE_CLIENT_NAME: "WEB",
    INNERTUBE_CLIENT_VERSION: "2.20210721.00.00",
    INNERTUBE_CONTEXT: {},
    STS: 18834, // signatureTimestamp (relevant for the cipher functions)
    LOGGED_IN: false,
};

// The following proxies are currently used as fallback if the innertube age-gate bypass doesn't work...
// You can host your own account proxy instance. See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
const ACCOUNT_PROXY_SERVER_HOST = "https://youtube-proxy.zerody.one";
const VIDEO_PROXY_SERVER_HOST = "https://phx.4everproxy.com";

const ENABLE_UNLOCK_NOTIFICATION = true;

const nativeParse = window.JSON.parse; // Backup the original parse function
const nativeDefineProperty = getNativeDefineProperty(); // Backup the original defineProperty function to intercept setter & getter on the ytInitialPlayerResponse
const nativeXmlHttpOpen = XMLHttpRequest.prototype.open;

// Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
let { get: chainedPlayerGetter, set: chainedPlayerSetter } = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse") || {};

let wrappedPlayerResponse;
let wrappedNextResponse;
let lastProxiedGoogleVideoUrlParams;
let responseCache = {};

const Deferred = function () {
    return Object.assign(new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    }), this);
};

const Notification = (() => {
    const isPolymer = !!window.Polymer;

    const pageLoad = new Deferred();
    const pageLoadEventName = isPolymer ? 'yt-navigate-finish' : 'state-navigateend';

    const node = isPolymer
        ? createElement('tp-yt-paper-toast')
        : createElement('c3-toast', { innerHTML: '<ytm-notification-action-renderer><div class="notification-action-response-text"></div></ytm-notification-action-renderer>' });

    const nMobileText = !isPolymer && node.querySelector('.notification-action-response-text');

    window.addEventListener(pageLoadEventName, init, { once: true });

    function init() {
        document.body.append(node);
        pageLoad.resolve();
    }

    function show(message, duration = 5) {
        if (!ENABLE_UNLOCK_NOTIFICATION) return;

        pageLoad.then(_show);

        function _show() {
            if (isPolymer) {
                node.duration = duration * 1000;
                node.show(message);
            } else {
                nMobileText.innerHTML = message;
                node.setAttribute('dir', 'in');
                setTimeout(() => {
                    node.setAttribute('dir', 'out');
                }, duration * 1000 + 225);
            }
        }
    }

    return { show };
})();

// Just for compatibility: Intercept (re-)definitions on YouTube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
Object.defineProperty = (obj, prop, descriptor) => {
    if (obj === window && PLAYER_RESPONSE_ALIASES.includes(prop)) {
        console.info("Another extension tries to redefine '" + prop + "' (probably an AdBlock extension). Chain it...");

        if (descriptor?.set) chainedPlayerSetter = descriptor.set;
        if (descriptor?.get) chainedPlayerGetter = descriptor.get;
    } else {
        nativeDefineProperty(obj, prop, descriptor);
    }
};

// Redefine 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
nativeDefineProperty(window, "ytInitialPlayerResponse", {
    set: (playerResponse) => {
        // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by Brave browser shield)
        if (playerResponse === wrappedPlayerResponse) return;

        wrappedPlayerResponse = inspectJsonData(playerResponse);
        if (typeof chainedPlayerSetter === "function") chainedPlayerSetter(wrappedPlayerResponse);
    },
    get: () => {
        if (typeof chainedPlayerGetter === "function") try { return chainedPlayerGetter() } catch (err) { };
        return wrappedPlayerResponse || {};
    },
    configurable: true,
});

// Also redefine 'ytInitialData' for the initial next/sidebar response
nativeDefineProperty(window, "ytInitialData", {
    set: (nextResponse) => { wrappedNextResponse = inspectJsonData(nextResponse); },
    get: () => wrappedNextResponse,
    configurable: true,
});

// Intercept XMLHttpRequest.open to rewrite video URL's (sometimes required)
XMLHttpRequest.prototype.open = function () {
    if (arguments.length > 1 && typeof arguments[1] === "string" && arguments[1].indexOf("https://") === 0) {
        const method = arguments[0];
        const url = new URL(arguments[1]);
        const urlParams = new URLSearchParams(url.search);

        // If the account proxy was used to retieve the video info, the following applies:
        // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
        // to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
        // this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...

        function isGoogleVideo() {
            return method === "GET" && url.host.indexOf(".googlevideo.com") > 0;
        }

        function hasGcrFlag() {
            return urlParams.get("gcr") !== null;
        }

        function isUnlockedByAccountProxy() {
            return urlParams.get("id") !== null && urlParams.get("id") === lastProxiedGoogleVideoUrlParams?.get("id");
        }

        if (VIDEO_PROXY_SERVER_HOST && isGoogleVideo() && hasGcrFlag() && isUnlockedByAccountProxy()) {
            // rewrite request URL
            arguments[1] = VIDEO_PROXY_SERVER_HOST + "/direct/" + btoa(arguments[1]);

            // solve CORS errors by preventing YouTube from enabling the "withCredentials" option (not required for the proxy)
            nativeDefineProperty(this, "withCredentials", {
                set: () => { },
                get: () => false,
            });
        }
    }

    return nativeXmlHttpOpen.apply(this, arguments);
};

// Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
window.JSON.parse = (text, reviver) => inspectJsonData(nativeParse(text, reviver));

function inspectJsonData(parsedData) {
    // If YouTube does JSON.parse(null) or similar weird things
    if (typeof parsedData !== "object" || parsedData === null) return parsedData;

    try {
        // Unlock #1: Array based in "&pbj=1" AJAX response on any navigation (does not seem to be used anymore)
        if (Array.isArray(parsedData)) {
            const { playerResponse } = parsedData.find(e => typeof e.playerResponse === "object") || {};

            if (playerResponse && isAgeRestricted(playerResponse.playabilityStatus)) {
                playerResponseArrayItem.playerResponse = unlockPlayerResponse(playerResponse);

                const { response: nextResponse } = parsedData.find(e => typeof e.response === "object") || {};

                if (isWatchNextObject(nextResponse) && !isLoggedIn() && isWatchNextSidebarEmpty(nextResponse.contents)) {
                    nextResponseArrayItem.response = unlockNextResponse(nextResponse);
                }
            }
        }

        // Unlock #2: Another JSON-Object containing the 'playerResponse' (seems to be used by m.youtube.com with &pbj=1)
        if (parsedData.playerResponse?.playabilityStatus && parsedData.playerResponse?.videoDetails && isAgeRestricted(parsedData.playerResponse.playabilityStatus)) {
            parsedData.playerResponse = unlockPlayerResponse(parsedData.playerResponse);
        }

        // Unlock #3: Initial page data structure and response from the '/youtubei/v1/player' endpoint
        if (parsedData.playabilityStatus && parsedData.videoDetails && isAgeRestricted(parsedData.playabilityStatus)) {
            parsedData = unlockPlayerResponse(parsedData);
        }

        // Equivelant of unlock #2 for sidebar/next response
        if (isWatchNextObject(parsedData.response) && !isLoggedIn() && isWatchNextSidebarEmpty(parsedData.response.contents)) {
            parsedData.response = unlockNextResponse(parsedData.response);
        }

        // Equivelant of unlock #3 for sidebar/next response
        if (isWatchNextObject(parsedData) && !isLoggedIn() && isWatchNextSidebarEmpty(parsedData.contents)) {
            parsedData = unlockNextResponse(parsedData)
        }
    } catch (err) {
        console.error("Simple-YouTube-Age-Restriction-Bypass-Error:", err, "You can report bugs at: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues");
    }

    return parsedData;
}

function isAgeRestricted(playabilityStatus) {
    if (!playabilityStatus?.status) return false;
    return !!playabilityStatus.desktopLegacyAgeGateReason || UNLOCKABLE_PLAYER_STATES.includes(playabilityStatus.status);
}

function isWatchNextObject(parsedData) {
    if (!parsedData?.contents || !parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
}

function isWatchNextSidebarEmpty(contents) {
    const secondaryResults = contents.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
    if (secondaryResults?.results) return false;

    // MWEB response layout
    const singleColumnWatchNextContents = contents.singleColumnWatchNextResults?.results?.results?.contents;
    if (!singleColumnWatchNextContents) return true;

    const { itemSectionRenderer } = singleColumnWatchNextContents.find(e => e.itemSectionRenderer?.targetId === "watch-next-feed") || {};

    return !!itemSectionRenderer;
}

function isLoggedIn() {
    setInnertubeConfigFromYtcfg();
    return INNERTUBE_CONFIG.LOGGED_IN;
}

function unlockPlayerResponse(playerResponse) {
    const videoId = playerResponse.videoDetails.videoId;
    const reason = playerResponse.playabilityStatus?.status;
    const unlockedPayerResponse = getUnlockedPlayerResponse(videoId, reason);

    // account proxy error?
    if (unlockedPayerResponse.errorMessage) {
        Notification.show("Unable to unlock this video 🙁 - More information in the developer console (ProxyError)", 10);
        throw new Error(`Unlock Failed, errorMessage:${unlockedPayerResponse.errorMessage}; innertubeApiKey:${INNERTUBE_CONFIG.INNERTUBE_API_KEY}; innertubeClientName:${INNERTUBE_CONFIG.INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${INNERTUBE_CONFIG.INNERTUBE_CLIENT_VERSION}`);
    }

    // check if the unlocked response isn't playable
    if (unlockedPayerResponse.playabilityStatus?.status !== "OK") {
        Notification.show(`Unable to unlock this video 🙁 - More information in the developer console (playabilityStatus: ${unlockedPayerResponse.playabilityStatus?.status})`, 10);
        throw new Error(`Unlock Failed, playabilityStatus:${unlockedPayerResponse.playabilityStatus?.status}; innertubeApiKey:${INNERTUBE_CONFIG.INNERTUBE_API_KEY}; innertubeClientName:${INNERTUBE_CONFIG.INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${INNERTUBE_CONFIG.INNERTUBE_CLIENT_VERSION}`);
    }

    // if the video info was retrieved via proxy, store the URL params from the url- or signatureCipher-attribute to detect later if the requested video files are from this unlock.
    // => see isUnlockedByAccountProxy()
    if (unlockedPayerResponse.proxied && unlockedPayerResponse.streamingData?.adaptiveFormats) {
        const cipherText = unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.signatureCipher)?.signatureCipher;
        const videoUrl = cipherText ? new URLSearchParams(cipherText).get("url") : unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.url)?.url;

        lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
    }

    Notification.show("Video successfully unlocked!");

    return unlockedPayerResponse;
}

function unlockNextResponse(nextResponse) {
    const { videoId, playlistId, index: playlistIndex } = nextResponse.currentVideoEndpoint.watchEndpoint;
    const unlockedNextResponse = getUnlockedNextResponse(videoId, playlistId, playlistIndex);

    // check if the unlocked response's sidebar is still empty
    if (isWatchNextSidebarEmpty(unlockedNextResponse.contents)) {
        throw new Error(`Sidebar Unlock Failed, innertubeApiKey:${INNERTUBE_CONFIG.INNERTUBE_API_KEY}; innertubeClientName:${INNERTUBE_CONFIG.INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${INNERTUBE_CONFIG.INNERTUBE_CLIENT_VERSION}`);
    }

    // Transfer WatchNextResults to original response
    if (nextResponse.contents?.twoColumnWatchNextResults?.secondaryResults) {
        nextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse?.contents?.twoColumnWatchNextResults?.secondaryResults;
    }

    // Transfer mobile (MWEB) WatchNextResults to original response
    if (nextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents) {
        const unlockedWatchNextFeed = unlockedNextResponse?.contents?.singleColumnWatchNextResults?.results?.results?.contents
            ?.find(x => x.itemSectionRenderer?.targetId === "watch-next-feed");
        if (unlockedWatchNextFeed) nextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);
    }

    // Transfer video description to original response
    const originalVideoSecondaryInfoRenderer = nextResponse.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;
    const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents?.twoColumnWatchNextResults?.results?.results?.contents
        ?.find(x => x.videoSecondaryInfoRenderer)?.videoSecondaryInfoRenderer;

    if (originalVideoSecondaryInfoRenderer && unlockedVideoSecondaryInfoRenderer?.description)
        originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

    // Transfer mobile (MWEB) video description to original response
    const originalStructuredDescriptionContentRenderer = nextResponse.engagementPanels
        ?.find(x => x.engagementPanelSectionListRenderer)?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
        ?.find(x => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        ?.find(x => x.engagementPanelSectionListRenderer)?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
        ?.find(x => x.expandableVideoDescriptionBodyRenderer);

    if (originalStructuredDescriptionContentRenderer && unlockedStructuredDescriptionContentRenderer?.expandableVideoDescriptionBodyRenderer)
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;

    return nextResponse;
}

function getUnlockedPlayerResponse(videoId, reason) {
    // Check if response is cached
    if (responseCache.videoId === videoId) return responseCache.playerResponse;

    setInnertubeConfigFromYtcfg();

    let playerResponse = useInnertubeEmbed();

    if (playerResponse?.playabilityStatus?.status !== "OK") playerResponse = useProxy();

    // Cache response for 10 seconds
    responseCache = { videoId, playerResponse };
    setTimeout(() => { responseCache = {} }, 10000);

    return playerResponse;

    // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube API
    // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
    function useInnertubeEmbed() {
        console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Unlock Method #1 (Innertube Embed)");
        const payload = getInnertubeEmbedPayload(videoId);
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", `/youtubei/v1/player?key=${INNERTUBE_CONFIG.INNERTUBE_API_KEY}`, false); // Synchronous!!!
        xmlhttp.send(JSON.stringify(payload));
        return nativeParse(xmlhttp.responseText);
    }

    // Strategy 2: Retrieve the video info from an account proxy server.
    // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
    function useProxy() {
        console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Unlock Method #2 (Account Proxy)");
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", ACCOUNT_PROXY_SERVER_HOST + `/getPlayer?videoId=${encodeURIComponent(videoId)}&reason=${encodeURIComponent(reason)}&clientName=${INNERTUBE_CONFIG.INNERTUBE_CLIENT_NAME}&clientVersion=${INNERTUBE_CONFIG.INNERTUBE_CLIENT_VERSION}&signatureTimestamp=${INNERTUBE_CONFIG.STS}`, false); // Synchronous!!!
        xmlhttp.send(null);
        const playerResponse = nativeParse(xmlhttp.responseText);
        playerResponse.proxied = true;
        return playerResponse;
    }
}

function getUnlockedNextResponse(videoId, playlistId, playlistIndex) {
    setInnertubeConfigFromYtcfg();

    // Retrieve the video info by using a age-gate bypass for the innertube API
    // Source: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/16#issuecomment-889232425
    console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Sidebar Unlock Method (Innertube Embed)");
    const payload = getInnertubeEmbedPayload(videoId, playlistId, playlistIndex);
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/v1/next?key=${INNERTUBE_CONFIG.INNERTUBE_API_KEY}`, false); // Synchronous!!!
    xmlhttp.send(JSON.stringify(payload));
    return nativeParse(xmlhttp.responseText);
}

function getInnertubeEmbedPayload(videoId, playlistId, playlistIndex) {
    const data = {
        context: {
            client: {
                clientName: INNERTUBE_CONFIG.INNERTUBE_CLIENT_NAME.replace('_EMBEDDED_PLAYER', ''),
                clientVersion: INNERTUBE_CONFIG.INNERTUBE_CLIENT_VERSION,
                clientScreen: "EMBED",
            },
            thirdParty: {
                embedUrl: "https://www.youtube.com/",
            },
        },
        playbackContext: {
            contentPlaybackContext: {
                signatureTimestamp: INNERTUBE_CONFIG.STS,
            },
        },
        videoId,
        playlistId,
        playlistIndex,
    };

    // Append client info from INNERTUBE_CONTEXT
    if (typeof INNERTUBE_CONFIG.INNERTUBE_CONTEXT?.client === "object") {
        data.context.client = { ...data.context.client, ...INNERTUBE_CONFIG.INNERTUBE_CONTEXT.client };
    }

    return data;
}

// to avoid version conflicts between client and server response, the current YouTube version config will be determined
function setInnertubeConfigFromYtcfg() {
    if (!window.ytcfg) {
        console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration (window.ytcfg). Using old values...");
        return;
    }

    for (const key in INNERTUBE_CONFIG) {
        const value = window.ytcfg.data_?.[key] ?? window.ytcfg.get?.(key);
        if (value !== undefined && value !== null) {
            INNERTUBE_CONFIG[key] = value;
        } else {
            console.warn(`Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration variable '${key}'. Using old value...`);
        }
    }
}

// Some extensions like AdBlock override the Object.defineProperty function to prevent a redefinition of the 'ytInitialPlayerResponse' variable by YouTube.
// But we need to define a custom descriptor to that variable to intercept its value. This behavior causes a race condition depending on the execution order with this script :(
// This function tries to restore the native Object.defineProperty function...
function getNativeDefineProperty() {
    // Check if the Object.defineProperty function is native (original)
    if (Object.defineProperty?.toString().indexOf("[native code]") > -1) {
        return Object.defineProperty;
    }

    // if the Object.defineProperty function is already overidden, try to restore the native function from another window...
    const tempFrame = createElement("iframe", { style: `display: none;` });
    document.documentElement.append(tempFrame);

    const nativeDefineProperty = tempFrame?.contentWindow?.Object?.defineProperty;

    tempFrame.remove();

    if (nativeDefineProperty) {
        console.info("Simple-YouTube-Age-Restriction-Bypass: Overidden Object.defineProperty function successfully restored!");
        return nativeDefineProperty;
    } else {
        console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to restore the original Object.defineProperty function");
        return Object.defineProperty;
    }
}

function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}
