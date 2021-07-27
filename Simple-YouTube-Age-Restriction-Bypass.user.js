// ==UserScript==
// @name            Simple YouTube Age Restriction Bypass
// @name:de         Simple YouTube Age Restriction Bypass
// @version         2.0.2
// @description     View age restricted videos on YouTube without verification and login :)
// @description:de  Schaue YouTube Videos mit Altersbeschränkungen ohne Anmeldung und ohne dein Alter zu bestätigen :)
// @author          Zerody (https://github.com/zerodytrash)
// @namespace       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/
// @updateURL       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js
// @downloadURL     https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js
// @supportURL      https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues
// @license         MIT
// @match           https://www.youtube.com/*
// @grant           none
// @run-at          document-start
// ==/UserScript==

(function () {

    var nativeParse = window.JSON.parse; // Backup the original parse function
    var nativeDefineProperty = getNativeDefineProperty(); // Backup the original defineProperty function to intercept setter & getter on the ytInitialPlayerResponse
    var nativeXmlHttpOpen = XMLHttpRequest.prototype.open;
    var wrappedPlayerResponse = null;
    var unlockablePlayerStates = ["AGE_VERIFICATION_REQUIRED", "LOGIN_REQUIRED", "UNPLAYABLE"];
    var playerResponsePropertyAliases = ["ytInitialPlayerResponse", "playerResponse"];
    var innertubeApiKey = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
    var lastProxiedGoogleVideoUrlParams = null;
    var responseCache = {};

    // The following proxies are currently used as fallback if the innertube age-gate bypass doesn't work...
    // You can host your own account proxy instance. See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
    var accountProxyServerHost = "https://youtube-proxy.zerody.one";
    var videoProxyServerHost = "https://phx.4everproxy.com";

    // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
    var initialPlayerResponseDescriptor = window.Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse");
    var chainedSetter = initialPlayerResponseDescriptor ? initialPlayerResponseDescriptor.set : null;
    var chainedGetter = initialPlayerResponseDescriptor ? initialPlayerResponseDescriptor.get : null;

    // Just for compatibility: Intercept (re-)definitions on Youtube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
    window.Object.defineProperty = function (obj, prop, descriptor) {
        if (obj === window && playerResponsePropertyAliases.includes(prop)) {
            console.info("Another extension tries to re-define '" + prop + "' (probably an AdBlock extension). Chain it...");

            if (descriptor && descriptor.set) chainedSetter = descriptor.set;
            if (descriptor && descriptor.get) chainedGetter = descriptor.get;
        } else {
            nativeDefineProperty(obj, prop, descriptor);
        }
    }

    // Re-define 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
    nativeDefineProperty(window, "ytInitialPlayerResponse", {
        set: function (playerResponse) {

            // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by brave browser shield)
            if (playerResponse === wrappedPlayerResponse) return;

            wrappedPlayerResponse = inspectJsonData(playerResponse);
            if (typeof chainedSetter === "function") chainedSetter(wrappedPlayerResponse);
        },
        get: function () {
            if (typeof chainedGetter === "function") try { return chainedGetter() } catch (err) { };
            return wrappedPlayerResponse || {};
        },
        configurable: true
    });

    // Intercept XMLHttpRequest.open to rewrite video url's
    XMLHttpRequest.prototype.open = function () {

        if (arguments.length > 1 && typeof arguments[1] === "string" && arguments[1].indexOf("https://") === 0) {
            var method = arguments[0];
            var url = new URL(arguments[1]);
            var urlParams = new URLSearchParams(url.search);

            // if the account proxy was used to retieve the video info, the following applies:
            // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
            // to get around this, the googlevideo url will be replaced with a web-proxy url in the same country (US).
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

                // rewrite request url
                arguments[1] = videoProxyServerHost + "/direct/" + btoa(arguments[1]);

                // solve CORS errors by preventing youtube from enabling the "withCredentials" option (not required for the proxy)
                nativeDefineProperty(this, "withCredentials", {
                    set: function () { },
                    get: function () {
                        return false;
                    }
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
        try {
            // Unlock #1: Array based in "&pbj=1" AJAX response on any navigation
            if (Array.isArray(parsedData)) {
                var playerResponseArrayItem = parsedData.find(e => typeof e.playerResponse === "object");
                var playerResponse = playerResponseArrayItem ? playerResponseArrayItem.playerResponse : null;

                if (playerResponse && isUnlockable(playerResponse.playabilityStatus)) {
                    playerResponseArrayItem.playerResponse = unlockPlayerResponse(playerResponse);
                }
            }

            // Unlock #2: Another JSON-Object containing the 'playerResponse'
            if (parsedData.playerResponse && parsedData.playerResponse.playabilityStatus && parsedData.playerResponse.videoDetails && isUnlockable(parsedData.playerResponse.playabilityStatus)) {
                parsedData.playerResponse = unlockPlayerResponse(parsedData.playerResponse);
            }

            // Unlock #3: Initial page data structure and raw player response
            if (parsedData.playabilityStatus && parsedData.videoDetails && isUnlockable(parsedData.playabilityStatus)) {
                parsedData = unlockPlayerResponse(parsedData);
            }

        } catch (err) {
            console.error("Simple-YouTube-Age-Restriction-Bypass-Error:", err);
        }

        return parsedData;
    }

    function isUnlockable(playabilityStatus) {
        if (!playabilityStatus || !playabilityStatus.status) return false;
        return unlockablePlayerStates.includes(playabilityStatus.status);
    }

    function unlockPlayerResponse(playerResponse) {
        var videoId = playerResponse.videoDetails.videoId;
        var reason = playerResponse.playabilityStatus?.status;

        var unlockedPayerResponse = getUnlockedPlayerResponse(videoId, reason);

        // account proxy error?
        if (unlockedPayerResponse.errorMessage)
            throw ("Simple-YouTube-Age-Restriction-Bypass: Unlock Failed, errorMessage: " + unlockedPayerResponse.errorMessage);

        // check if the unlocked response isn't playable
        if (unlockedPayerResponse.playabilityStatus.status !== "OK")
            throw ("Simple-YouTube-Age-Restriction-Bypass: Unlock Failed, playabilityStatus: " + unlockedPayerResponse.playabilityStatus.status);

        // if the video info was retrieved via proxy, store the url params from the url- or signatureCipher-attribute to detect later if the requested video files are from this unlock.
        // => see isUnlockedByAccountProxy()
        if (unlockedPayerResponse.proxied && unlockedPayerResponse.streamingData?.adaptiveFormats) {
            var videoUrl = unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.url)?.url;
            var cipherText = unlockedPayerResponse.streamingData.adaptiveFormats.find(x => x.signatureCipher)?.signatureCipher;

            if (cipherText) videoUrl = new URLSearchParams(cipherText).get("url");

            lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
        }

        return unlockedPayerResponse;
    }

    function getUnlockedPlayerResponse(videoId, reason) {

        // Check if response is cached
        if (responseCache.videoId === videoId) return responseCache.content;

        var playerResponse = null;

        // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube api
        // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
        function useInnertubeEmbed() {
            var payload = getInnertubeEmbedPlayerPayload(videoId);
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("POST", "/youtubei/v1/player?key=" + innertubeApiKey, false); // Synchronous!!!
            xmlhttp.send(JSON.stringify(payload));
            playerResponse = nativeParse(xmlhttp.responseText);
        }

        // Strategy 2: Retrieve the video info from an account proxy server.
        // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
        function useProxy() {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", accountProxyServerHost + "/getPlayer?videoId=" + encodeURIComponent(videoId) + "&reason=" + encodeURIComponent(reason), false); // Synchronous!!!
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

    function getInnertubeEmbedPlayerPayload(videoId) {
        return {
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": "2.20210721.00.00",
                    "clientScreen": "EMBED"
                }
            },
            "videoId": videoId
        }
    }

    // Some extensions like AdBlock override the Object.defineProperty function to prevent a re-definition of the 'ytInitialPlayerResponse' variable by YouTube.
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

            var tempFrame = document.createElement("iframe");
            tempFrame.style.display = "none";

            document.body.insertAdjacentElement("beforeend", tempFrame);
            var nativeDefineProperty = tempFrame.contentWindow.Object.defineProperty;
            tempFrame.remove();

            console.info("Simple-YouTube-Age-Restriction-Bypass: Overidden Object.defineProperty function successfully restored!");

            return nativeDefineProperty;
        } catch (err) {
            console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to restore the original Object.defineProperty function", err);
            return window.Object.defineProperty;
        }
    }

})();