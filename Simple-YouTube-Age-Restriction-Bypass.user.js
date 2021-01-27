// ==UserScript==
// @name         Simple YouTube Age Restriction Bypass
// @namespace    https://zerody.one
// @version      0.1
// @description  Press ALT + U to view age restricted YouTube videos :)
// @author       ZerodyOne
// @match        https://www.youtube.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    document.addEventListener("keydown", function (e) {
        if (e.altKey && e.key === "u") {
            var videoId = new URLSearchParams(new URL(document.location).search).get("v");
            if(!videoId) return;;

            var popup = window.open(null, null, "width=640,height=360,resizable=yes");
            popup.focus();
            popup.document.write("<html><body style='color:white;background-color:black;'>Loading video...</body></html>");

            fetch("/get_video_info?video_id=" + videoId).then(response => response.text()).then((responseText) => {
                try {
                    var playerInfo = JSON.parse(new URLSearchParams(responseText).get("player_response"));
                    if(!playerInfo.streamingData || !playerInfo.streamingData.formats || !playerInfo.streamingData.formats.length) throw "video file not available.";

                    var videoElement = "<video controls autoplay style='height:100%; width:100%;'>";
                    playerInfo.streamingData.formats.forEach(function(source){
                        videoElement += "<source src='" + source.url + "' type='" + source.mimeType + "' />"
                    });
                    videoElement += "</video";

                    popup.document.body.innerHTML = videoElement;
                    popup.document.title = playerInfo.videoDetails.title;

                } catch(err) {
                    popup.document.body.innerText = "Error: " + err.toString();
                }
            }).catch(err => {
                popup.document.body.innerText = "Error: " + err.toString();
            })
        }
    });
})();