// ==UserScript==
// @name         Simple YouTube Age Restriction Bypass
// @namespace    https://zerody.one
// @version      0.3
// @description  View age restricted videos on YouTube without verification and login :)
// @author       ZerodyOne
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-body
// ==/UserScript==

(function() {

    var nativeParse = window.JSON.parse; // Backup the original parse function to prevent a call loop
    var useBypassEverywhere = false; // This option can be enabled to block video ads (Adblock), but it can cause negative side effects~
    var unlockablePlayerStates = ["AGE_VERIFICATION_REQUIRED", "LOGIN_REQUIRED"];
    var responseCache = {};

    // Unlock #1: Overwrite PlayerResponse in YT's inital page source
    if(window.ytInitialPlayerResponse && isUnlockable(window.ytInitialPlayerResponse.playabilityStatus)) {
        window.ytInitialPlayerResponse = unlockPlayerResponse(window.ytInitialPlayerResponse);
    }

    // Thats Smart! <3
    window.JSON.parse = function(json) {
        var parsedData = nativeParse(json);
        parsedData = inspectJsonData(parsedData);
        return parsedData;
    }

    function inspectJsonData(parsedData) {
        try {
            // Unlock #2: Array based in "&pbj=1" AJAX response on any navigation
            if(Array.isArray(parsedData)) {
                var playerResponseArrayItem = parsedData.find(e => typeof e.playerResponse === "object");
                var playerResponse = playerResponseArrayItem ? playerResponseArrayItem.playerResponse : null;

                if(playerResponse && isUnlockable(playerResponse.playabilityStatus)) {
                    playerResponseArrayItem.playerResponse = unlockPlayerResponse(playerResponse);
                }
            }

            // Unlock #3: Another JSON-Object
            if(parsedData.playerResponse && parsedData.playerResponse.playabilityStatus && parsedData.playerResponse.videoDetails && isUnlockable(parsedData.playerResponse.playabilityStatus)) {
                parsedData.playerResponse = unlockPlayerResponse(parsedData.playerResponse);
            }

            // Unlock #4: ...and another JSON-Object
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
        if(useBypassEverywhere) return true;
        return unlockablePlayerStates.includes(playabilityStatus.status);
    }

    function unlockPlayerResponse(playerResponse) {
        var videoId = playerResponse.videoDetails.videoId;
        var unlockedPayerResponse = getUnlockedPlayerResponse(videoId);

        // check if the unlocked response isn't playable
        if(unlockedPayerResponse.playabilityStatus.status !== "OK")
            throw ("Unlock Failed, playabilityStatus: " + unlockedPayerResponse.playabilityStatus.status);

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
})();