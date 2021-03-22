// ==UserScript==
// @name         Simple YouTube Age Restriction Bypass
// @namespace    https://zerody.one
// @version      0.7
// @description  View age restricted videos on YouTube without verification and login :)
// @author       ZerodyOne
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {

    var nativeParse = window.JSON.parse; // Backup the original parse function
    var nativeDefineProperty = getNativeDefineProperty(); // Backup the original defineProperty function to intercept setter & getter on the ytInitialPlayerResponse
    var wrappedPlayerResponse = null;
    var unlockablePlayerStates = ["AGE_VERIFICATION_REQUIRED", "LOGIN_REQUIRED"];
    var responseCache = {};

    // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
    var initialPlayerResponseDescriptor = window.Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse");
    var chainedSetter = initialPlayerResponseDescriptor ? initialPlayerResponseDescriptor.set : null;
    var chainedGetter = initialPlayerResponseDescriptor ? initialPlayerResponseDescriptor.get : null;

    // Just for compatibility: Intercept property (re-)definitions on 'ytInitialPlayerResponse' to chain setter/getter from other extensions by hijacking the Object.defineProperty function
    window.Object.defineProperty = function(obj, prop, descriptor) {
        if(obj === window && prop === "ytInitialPlayerResponse") {
            console.info("Another extension tries to re-define 'ytInitialPlayerResponse' (probably an AdBlock extension). Chain it...");

            if(descriptor && descriptor.set) chainedSetter = descriptor.set;
            if(descriptor && descriptor.get) chainedGetter = descriptor.get;
        } else {
            nativeDefineProperty(obj, prop, descriptor);
        }
    }

    // Re-define 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
    nativeDefineProperty(window, "ytInitialPlayerResponse", {
        set: function(playerResponse) {
            wrappedPlayerResponse = inspectJsonData(playerResponse);
            if(typeof chainedSetter === "function") chainedSetter(wrappedPlayerResponse);
        },
        get: function() {
            if(typeof chainedGetter === "function") try { return chainedGetter() } catch(err) { };
            return wrappedPlayerResponse || {};
        },
        configurable: true
    });

    // Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
    window.JSON.parse = function(text, reviver) {
        return inspectJsonData(nativeParse(text, reviver));
    }

    function inspectJsonData(parsedData) {
        try {
            // Unlock #1: Array based in "&pbj=1" AJAX response on any navigation
            if(Array.isArray(parsedData)) {
                var playerResponseArrayItem = parsedData.find(e => typeof e.playerResponse === "object");
                var playerResponse = playerResponseArrayItem ? playerResponseArrayItem.playerResponse : null;

                if(playerResponse && isUnlockable(playerResponse.playabilityStatus)) {
                    playerResponseArrayItem.playerResponse = unlockPlayerResponse(playerResponse);
                }
            }

            // Unlock #2: Another JSON-Object containing the 'playerResponse'
            if(parsedData.playerResponse && parsedData.playerResponse.playabilityStatus && parsedData.playerResponse.videoDetails && isUnlockable(parsedData.playerResponse.playabilityStatus)) {
                parsedData.playerResponse = unlockPlayerResponse(parsedData.playerResponse);
            }

            // Unlock #3: Initial page data structure and raw player response
            if(parsedData.playabilityStatus && parsedData.videoDetails && isUnlockable(parsedData.playabilityStatus)) {
                parsedData = unlockPlayerResponse(parsedData);
            }

        } catch(err) {
            console.error("Simple-YouTube-Age-Restriction-Bypass-Error:", err);
        }

        return parsedData;
    }

    function isUnlockable(playabilityStatus) {
        if(!playabilityStatus || !playabilityStatus.status) return false;
        return unlockablePlayerStates.includes(playabilityStatus.status);
    }

    function unlockPlayerResponse(playerResponse) {
        var videoId = playerResponse.videoDetails.videoId;
        var unlockedPayerResponse = getUnlockedPlayerResponse(videoId);

        // check if the unlocked response isn't playable
        if(unlockedPayerResponse.playabilityStatus.status !== "OK")
            throw ("Simple-YouTube-Age-Restriction-Bypass: Unlock Failed, playabilityStatus: " + unlockedPayerResponse.playabilityStatus.status);

        return unlockedPayerResponse;
    }

    function getUnlockedPlayerResponse(videoId) {

        // Check if is cached
        if(responseCache.videoId === videoId) return responseCache.content;

        // Query YT's unrestricted api endpoint
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET", "/get_video_info?video_id=" + encodeURIComponent(videoId), false); // Synchronous!!!
        xmlhttp.send(null);
        var playerResponse = nativeParse(new URLSearchParams(xmlhttp.responseText).get("player_response"));

        // If the video is age restricted and the uploader has disallowed the 'Allow embedding' option, these extra params can help in some cases...
        if (playerResponse.playabilityStatus.status === "UNPLAYABLE") {
            xmlhttp = new XMLHttpRequest();
            xmlhttp.open("GET", "/get_video_info?video_id=" + encodeURIComponent(videoId) + "&html5=1&eurl&ps=desktop-polymer&el=adunit&cbr=Chrome&cplatform=DESKTOP&break_type=1&autoplay=1&content_v&authuser=0", false); // Synchronous!!!
            xmlhttp.send(null);
            playerResponse = nativeParse(new URLSearchParams(xmlhttp.responseText).get("player_response"));
        }

        // Cache response for 10 seconds
        responseCache = { videoId: videoId, content: playerResponse };
        setTimeout(function() { responseCache = {} }, 10000);

        return playerResponse;
    }

    // Some extensions like AdBlock override the Object.defineProperty function to prevent a re-definition of the 'ytInitialPlayerResponse' variable by YouTube.
    // But we need to define a custom descriptor to that variable to intercept his value. This behavior causes a race condition depending on the execution order with this script :(
    // This function tries to restore the native Object.defineProperty function...
    function getNativeDefineProperty() {

        // Check if the Object.defineProperty function is native (original)
        if(window.Object.defineProperty && window.Object.defineProperty.toString().indexOf("[native code]") > -1) {
            return window.Object.defineProperty;
        }

        // if the Object.defineProperty function is already overidden, try to restore the native function from another window...
        try {
            if(!document.body) document.body = document.createElement("body");

            var tempFrame = document.createElement("iframe");
            tempFrame.style.display = "none";

            document.body.insertAdjacentElement("beforeend", tempFrame);
            var nativeDefineProperty = tempFrame.contentWindow.Object.defineProperty;
            tempFrame.remove();

            console.info("Simple-YouTube-Age-Restriction-Bypass: Overidden Object.defineProperty function successfully restored!");

            return nativeDefineProperty;
        } catch(err) {
            console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to restore the original Object.defineProperty function", err);
            return window.Object.defineProperty;
        }
    }

})();
