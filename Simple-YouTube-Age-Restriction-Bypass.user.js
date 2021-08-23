// ==UserScript==
// @name            Simple YouTube Age Restriction Bypass
// @description     Watch age restricted videos on YouTube without login and without age verification :)
// @description:de  Schaue YouTube Videos mit Altersbeschränkungen ohne Anmeldung und ohne dein Alter zu bestätigen :)
// @description:fr  Regardez des vidéos YouTube avec des restrictions d'âge sans vous inscrire et sans confirmer votre âge :)
// @description:it  Guarda i video con restrizioni di età su YouTube senza login e senza verifica dell'età :)
// @version         2.1.2
// @author          Zerody (https://github.com/zerodytrash)
// @namespace       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/
// @updateURL       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js
// @downloadURL     https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js
// @supportURL      https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues
// @license         MIT
// @match           https://www.youtube.com/*
// @match           https://m.youtube.com/*
// @grant           none
// @run-at          document-start
// @compatible      chrome Chrome + Tampermonkey or Violentmonkey
// @compatible      firefox Firefox + Greasemonkey or Tampermonkey or Violentmonkey
// @compatible      opera Opera + Tampermonkey or Violentmonkey
// @compatible      edge Edge + Tampermonkey or Violentmonkey
// @compatible      safari Safari + Tampermonkey or Violentmonkey
// ==/UserScript==

const initUnlocker = function () {

    const nativeParse = window.JSON.parse; // Backup the original parse function
    const nativeDefineProperty = getNativeDefineProperty(); // Backup the original defineProperty function to intercept setter & getter on the ytInitialPlayerResponse
    const nativeXmlHttpOpen = XMLHttpRequest.prototype.open;

    const unlockablePlayerStates = ["AGE_VERIFICATION_REQUIRED", "AGE_CHECK_REQUIRED", "LOGIN_REQUIRED"];
    const playerResponsePropertyAliases = ["ytInitialPlayerResponse", "playerResponse"];

    let wrappedPlayerResponse = null;
    let wrappedNextResponse = null;
    let lastProxiedGoogleVideoUrlParams = null;
    let responseCache = {};

    // YouTube API config (Innertube). 
    // The actual values will be determined later from the global ytcfg variable => setInnertubeConfigFromYtcfg()
    let innertubeConfig = {
        INNERTUBE_API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
        INNERTUBE_CLIENT_NAME: "WEB",
        INNERTUBE_CLIENT_VERSION: "2.20210721.00.00",
        INNERTUBE_CONTEXT: {},
        STS: 18834, // signatureTimestamp (relevant for the cipher functions)
        LOGGED_IN: false
    };

    // The following proxies are currently used as fallback if the innertube age-gate bypass doesn't work...
    // You can host your own account proxy instance. See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
    const accountProxyServerHost = "https://youtube-proxy.zerody.one";
    const videoProxyServerHost = "https://phx.4everproxy.com";

    // UI-related stuff (notifications, ...)
    const enableUnlockNotification = true;
    let playerCreationObserver = null;
    let notificationElement = null;
    let notificationTimeout = null;

    // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
    let initialPlayerResponseDescriptor = window.Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse");
    let chainedPlayerSetter = initialPlayerResponseDescriptor ? initialPlayerResponseDescriptor.set : null;
    let chainedPlayerGetter = initialPlayerResponseDescriptor ? initialPlayerResponseDescriptor.get : null;

    // Just for compatibility: Intercept (re-)definitions on YouTube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
    window.Object.defineProperty = function (obj, prop, descriptor) {
        if (obj === window && playerResponsePropertyAliases.includes(prop)) {
            console.info("Another extension tries to redefine '" + prop + "' (probably an AdBlock extension). Chain it...");

            if (descriptor && descriptor.set) chainedPlayerSetter = descriptor.set;
            if (descriptor && descriptor.get) chainedPlayerGetter = descriptor.get;
        } else {
            nativeDefineProperty(obj, prop, descriptor);
        }
    }

    // Redefine 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
    nativeDefineProperty(window, "ytInitialPlayerResponse", {
        set: function (playerResponse) {
            // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by Brave browser shield)
            if (playerResponse === wrappedPlayerResponse) return;

            wrappedPlayerResponse = inspectJsonData(playerResponse);
            if (typeof chainedPlayerSetter === "function") chainedPlayerSetter(wrappedPlayerResponse);
        },
        get: function () {
            if (typeof chainedPlayerGetter === "function") try { return chainedPlayerGetter() } catch (err) { };
            return wrappedPlayerResponse || {};
        },
        configurable: true
    });

    // Also redefine 'ytInitialData' for the initial next/sidebar response
    nativeDefineProperty(window, "ytInitialData", {
        set: function (nextResponse) {
            wrappedNextResponse = inspectJsonData(nextResponse);
        },
        get: function () {
            return wrappedNextResponse;
        },
        configurable: true
    });

    // Intercept XMLHttpRequest.open to rewrite video URL's (sometimes required)
    XMLHttpRequest.prototype.open = function () {
        if (arguments.length > 1 && typeof arguments[1] === "string" && arguments[1].indexOf("https://") === 0) {
            let method = arguments[0];
            let url = new URL(arguments[1]);
            let urlParams = new URLSearchParams(url.search);

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
                return urlParams.get("id") !== null && lastProxiedGoogleVideoUrlParams && urlParams.get("id") === lastProxiedGoogleVideoUrlParams.get("id");
            }

            if (videoProxyServerHost && isGoogleVideo() && hasGcrFlag() && isUnlockedByAccountProxy()) {
                // rewrite request URL
                arguments[1] = videoProxyServerHost + "/direct/" + btoa(arguments[1]);

                // solve CORS errors by preventing YouTube from enabling the "withCredentials" option (not required for the proxy)
                nativeDefineProperty(this, "withCredentials", {
                    set: function () { },
                    get: function () { return false; }
                });
            }

        }

        return nativeXmlHttpOpen.apply(this, arguments);
    }

    // Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
    window.JSON.parse = function (text, reviver) {
        return inspectJsonData(nativeParse(text, reviver));
    }

    function inspectJsonData(parsedData) {

        // If YouTube does JSON.parse(null) or similar weird things
        if (typeof parsedData !== "object" || parsedData === null) return parsedData;

        try {
            // Unlock #1: Array based in "&pbj=1" AJAX response on any navigation (does not seem to be used anymore)
            if (Array.isArray(parsedData)) {
                let playerResponseArrayItem = parsedData.find(e => typeof e.playerResponse === "object");
                let playerResponse = playerResponseArrayItem?.playerResponse;

                if (playerResponse && isAgeRestricted(playerResponse.playabilityStatus)) {
                    playerResponseArrayItem.playerResponse = unlockPlayerResponse(playerResponse);

                    let nextResponseArrayItem = parsedData.find(e => typeof e.response === "object");
                    let nextResponse = nextResponseArrayItem?.response;

                    if (isWatchNextObject(nextResponse) && !isLoggedIn() && isWatchNextSidebarEmpty(nextResponse.contents)) {
                        nextResponseArrayItem.response = unlockNextResponse(nextResponse);
                    }
                }
            }

            // Hide unlock notification on navigation (if still visible from the last unlock)
            if (parsedData.playerResponse || parsedData.playabilityStatus) hidePlayerNotification();

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
        if (!playabilityStatus || !playabilityStatus.status) return false;

        return typeof playabilityStatus.desktopLegacyAgeGateReason !== "undefined" || unlockablePlayerStates.includes(playabilityStatus.status);
    }

    function isWatchNextObject(parsedData) {
        if (!parsedData?.contents) return false;
        if (!parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;

        return parsedData.contents.twoColumnWatchNextResults || parsedData.contents.singleColumnWatchNextResults;
    }

    function isWatchNextSidebarEmpty(contents) {
        let secondaryResults = contents.twoColumnWatchNextResults?.secondaryResults?.secondaryResults;
        if (secondaryResults && secondaryResults.results) return false;

        // MWEB response layout
        let singleColumnWatchNextContents = contents.singleColumnWatchNextResults?.results?.results?.contents;
        if (!singleColumnWatchNextContents) return true;

        let itemSectionRendererArrayItem = singleColumnWatchNextContents.find(e => e.itemSectionRenderer?.targetId === "watch-next-feed");
        let itemSectionRenderer = itemSectionRendererArrayItem?.itemSectionRenderer;

        return typeof itemSectionRenderer === "undefined";
    }

    function isLoggedIn() {
        setInnertubeConfigFromYtcfg();
        return innertubeConfig.LOGGED_IN;
    }

    function unlockPlayerResponse(playerResponse) {
        let videoId = playerResponse.videoDetails.videoId;
        let reason = playerResponse.playabilityStatus?.status;
        let unlockedPayerResponse = getUnlockedPlayerResponse(videoId, reason);

        // account proxy error?
        if (unlockedPayerResponse.errorMessage) {
            showPlayerNotification("#7b1e1e", "Unable to unlock this video :( Please look into the developer console for more details. (ProxyError)", 10);
            throw new Error(`Unlock Failed, errorMessage:${unlockedPayerResponse.errorMessage}; innertubeApiKey:${innertubeConfig.INNERTUBE_API_KEY}; innertubeClientName:${innertubeConfig.INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${innertubeConfig.INNERTUBE_CLIENT_VERSION}`);
        }

        // check if the unlocked response isn't playable
        if (unlockedPayerResponse.playabilityStatus?.status !== "OK") {
            showPlayerNotification("#7b1e1e", `Unable to unlock this video :( Please look into the developer console for more details. (playabilityStatus: ${unlockedPayerResponse.playabilityStatus?.status})`, 10);
            throw new Error(`Unlock Failed, playabilityStatus:${unlockedPayerResponse.playabilityStatus?.status}; innertubeApiKey:${innertubeConfig.INNERTUBE_API_KEY}; innertubeClientName:${innertubeConfig.INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${innertubeConfig.INNERTUBE_CLIENT_VERSION}`);
        }

        // if the video info was retrieved via proxy, store the URL params from the url- or signatureCipher-attribute to detect later if the requested video files are from this unlock.
        // => see isUnlockedByAccountProxy()
        if (unlockedPayerResponse.proxied && unlockedPayerResponse.streamingData?.adaptiveFormats) {
            let videoUrl = unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.url)?.url;
            let cipherText = unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.signatureCipher)?.signatureCipher;

            if (cipherText) videoUrl = new URLSearchParams(cipherText).get("url");

            lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
        }

        showPlayerNotification("#005c04", "Age-restricted video successfully unlocked!", 4);

        return unlockedPayerResponse;
    }

    function unlockNextResponse(nextResponse) {
        let watchEndpoint = nextResponse.currentVideoEndpoint.watchEndpoint;
        let videoId = watchEndpoint.videoId;
        let playlistId = watchEndpoint.playlistId;
        let playlistIndex = watchEndpoint.index;
        let unlockedNextResponse = getUnlockedNextResponse(videoId, playlistId, playlistIndex);

        // check if the unlocked response's sidebar is still empty
        if (isWatchNextSidebarEmpty(unlockedNextResponse.contents)) {
            throw new Error(`Sidebar Unlock Failed, innertubeApiKey:${innertubeConfig.INNERTUBE_API_KEY}; innertubeClientName:${innertubeConfig.INNERTUBE_CLIENT_NAME}; innertubeClientVersion:${innertubeConfig.INNERTUBE_CLIENT_VERSION}`);
        }

        // Transfer WatchNextResults to original response
        if (nextResponse.contents?.twoColumnWatchNextResults?.secondaryResults) {
            nextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse?.contents?.twoColumnWatchNextResults?.secondaryResults;
        }

        // Transfer mobile (MWEB) WatchNextResults to original response
        if (nextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents) {
            let unlockedWatchNextFeed = unlockedNextResponse?.contents?.singleColumnWatchNextResults?.results?.results?.contents?.find(x => x.itemSectionRenderer?.targetId === "watch-next-feed");
            if (unlockedWatchNextFeed) nextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);
        }

        return nextResponse;
    }

    function getUnlockedPlayerResponse(videoId, reason) {
        // Check if response is cached
        if (responseCache.videoId === videoId) return responseCache.content;

        setInnertubeConfigFromYtcfg();

        let playerResponse = null;

        // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube API
        // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
        function useInnertubeEmbed() {
            console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Unlock Method #1 (Innertube Embed)");
            const payload = getInnertubeEmbedPayload(videoId);
            const xmlhttp = new XMLHttpRequest();
            xmlhttp.open("POST", `/youtubei/v1/player?key=${innertubeConfig.INNERTUBE_API_KEY}`, false); // Synchronous!!!
            xmlhttp.send(JSON.stringify(payload));
            playerResponse = nativeParse(xmlhttp.responseText);
        }

        // Strategy 2: Retrieve the video info from an account proxy server.
        // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
        function useProxy() {
            console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Unlock Method #2 (Account Proxy)");
            const xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", accountProxyServerHost + `/getPlayer?videoId=${encodeURIComponent(videoId)}&reason=${encodeURIComponent(reason)}&clientName=${innertubeConfig.INNERTUBE_CLIENT_NAME}&clientVersion=${innertubeConfig.INNERTUBE_CLIENT_VERSION}&signatureTimestamp=${innertubeConfig.STS}`, false); // Synchronous!!!
            xmlhttp.send(null);
            playerResponse = nativeParse(xmlhttp.responseText);
            playerResponse.proxied = true;
        }

        if (playerResponse?.playabilityStatus?.status !== "OK") useInnertubeEmbed();
        if (playerResponse?.playabilityStatus?.status !== "OK") useProxy();

        // Cache response for 10 seconds
        responseCache = { videoId: videoId, content: playerResponse };
        setTimeout(function () { responseCache = {} }, 10000);

        return playerResponse;
    }

    function getUnlockedNextResponse(videoId, playlistId, playlistIndex) {

        setInnertubeConfigFromYtcfg();

        // Retrieve the video info by using a age-gate bypass for the innertube API
        // Source: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/16#issuecomment-889232425
        console.info("Simple-YouTube-Age-Restriction-Bypass: Trying Sidebar Unlock Method (Innertube Embed)");
        const payload = getInnertubeEmbedPayload(videoId, playlistId, playlistIndex);
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", `/youtubei/v1/next?key=${innertubeConfig.INNERTUBE_API_KEY}`, false); // Synchronous!!!
        xmlhttp.send(JSON.stringify(payload));
        return nativeParse(xmlhttp.responseText);
    }

    function getInnertubeEmbedPayload(videoId, playlistId, playlistIndex) {
        let data = {
            context: {
                client: {
                    clientName: innertubeConfig.INNERTUBE_CLIENT_NAME.replace('_EMBEDDED_PLAYER', ''),
                    clientVersion: innertubeConfig.INNERTUBE_CLIENT_VERSION,
                    clientScreen: "EMBED"
                },
                thirdParty: {
                    embedUrl: "https://www.youtube.com/"
                }
            },
            playbackContext: {
                contentPlaybackContext: {
                    signatureTimestamp: innertubeConfig.STS
                }
            },
            videoId: videoId,
            playlistId: playlistId,
            playlistIndex: playlistIndex
        }

        // Append client info from INNERTUBE_CONTEXT
        if (typeof innertubeConfig.INNERTUBE_CONTEXT?.client === "object") {
            data.context.client = Object.assign(innertubeConfig.INNERTUBE_CONTEXT.client, data.context.client);
        }

        return data;
    }

    // to avoid version conflicts between client and server response, the current YouTube version config will be determined
    function setInnertubeConfigFromYtcfg() {
        if (!window.ytcfg) {
            console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration (window.ytcfg). Using old values...");
            return;
        }

        for (const key in innertubeConfig) {
            const value = window.ytcfg.data_?.[key] ?? window.ytcfg.get?.(key);
            if (typeof value !== "undefined" && value !== null) {
                innertubeConfig[key] = value;
            } else {
                console.warn(`Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration variable '${key}'. Using old value...`);
            }
        }
    }

    function showPlayerNotification(color, message, displayDuration) {
        if (!enableUnlockNotification) return;
        if (typeof MutationObserver !== "function") return;

        try {
            // clear existing notifications
            disconnectPlayerCreationObserver();
            hidePlayerNotification();

            function getPlayerElement() {
                return document.querySelector("#primary > #primary-inner > #player") || document.querySelector("#player-container-id > #player");
            }

            function createNotification() {
                let playerElement = getPlayerElement();
                if (!playerElement) return;

                // first, remove existing notification
                hidePlayerNotification();

                // create new notification
                notificationElement = document.createElement("div");
                notificationElement.innerHTML = message;
                notificationElement.style = `width: 100%; text-align: center; background-color: ${color}; color: #ffffff; padding: 2px 0px 2px; font-size: 1.1em;`;
                notificationElement.id = "bypass-notification";

                // append below the player 
                playerElement.parentNode.insertBefore(notificationElement, playerElement.nextSibling);

                if (notificationTimeout) {
                    clearTimeout(notificationTimeout);
                    notificationTimeout = null;
                }

                notificationTimeout = setTimeout(hidePlayerNotification, displayDuration * 1000);
            }

            function disconnectPlayerCreationObserver() {
                if (playerCreationObserver) {
                    playerCreationObserver.disconnect();
                    playerCreationObserver = null;
                }
            }

            // Does the player already exist in the DOM?
            if (getPlayerElement() !== null) {
                createNotification();
                return;
            }

            // waiting for creation of the player element...
            playerCreationObserver = new MutationObserver(function (mutations) {
                if (getPlayerElement() !== null) {
                    disconnectPlayerCreationObserver();
                    createNotification();
                }
            });

            playerCreationObserver.observe(document.body, { childList: true });
        } catch (err) { }
    }

    function hidePlayerNotification() {
        if (playerCreationObserver) {
            playerCreationObserver.disconnect();
            playerCreationObserver = null;
        }

        if (notificationElement) {
            notificationElement.remove();
            notificationElement = null;
        }
    }

    // Some extensions like AdBlock override the Object.defineProperty function to prevent a redefinition of the 'ytInitialPlayerResponse' variable by YouTube.
    // But we need to define a custom descriptor to that variable to intercept his value. This behavior causes a race condition depending on the execution order with this script :(
    // This function tries to restore the native Object.defineProperty function...
    function getNativeDefineProperty() {
        // Check if the Object.defineProperty function is native (original)
        if (window.Object.defineProperty && window.Object.defineProperty.toString().indexOf("[native code]") > -1) {
            return window.Object.defineProperty;
        }

        // if the Object.defineProperty function is already overidden, try to restore the native function from another window...
        try {
            if (!document.body) document.body = document.createElement("body");

            let tempFrame = document.createElement("iframe");
            tempFrame.style.display = "none";

            document.body.insertAdjacentElement("beforeend", tempFrame);
            let nativeDefineProperty = tempFrame.contentWindow.Object.defineProperty;
            tempFrame.remove();

            console.info("Simple-YouTube-Age-Restriction-Bypass: Overidden Object.defineProperty function successfully restored!");

            return nativeDefineProperty;
        } catch (err) {
            console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to restore the original Object.defineProperty function", err);
            return window.Object.defineProperty;
        }
    }

};

// Just a trick to get around the sandbox restrictions in Firefox / Greasemonkey
// Greasemonkey => Inject code into the main window
// Tampermonkey & Violentmonkey => Execute code directly
if(GM_info?.scriptHandler === "Greasemonkey") {
    window.eval("("+ initUnlocker.toString() +")();");
} else {
    initUnlocker();
}
