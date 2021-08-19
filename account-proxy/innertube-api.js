const crypto = require("crypto")
const axios = require("axios");
const httpsProxyAgent = require("https-proxy-agent");

const generatePlayerRequestData = function (videoId, clientName, clientVersion, signatureTimestamp) {
    if (!clientName) clientName = "WEB";
    if (!clientVersion) clientVersion = "2.20210721.00.00";
    if (!signatureTimestamp) signatureTimestamp = 18834;

    return {
        "videoId": videoId,
        "context": {
            "client": {
                "hl": "en",
                "gl": "US",
                "deviceMake": "",
                "deviceModel": "",
                "visitorData": "CgtIZDE3aXJqLXFwNCiZpPaHBg%3D%3D",
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36,gzip(gfe)",
                "clientName": clientName,
                "clientVersion": clientVersion,
                "osName": "Windows",
                "osVersion": "10.0",
                "originalUrl": "https://www.youtube.com/watch?v=" + videoId,
                "screenPixelDensity": 1,
                "platform": "DESKTOP",
                "clientFormFactor": "UNKNOWN_FORM_FACTOR",
                "screenDensityFloat": 1.25,
                "timeZone": "Europe/Berlin",
                "browserName": "Chrome",
                "browserVersion": "91.0.4472.164",
                "screenWidthPoints": 834,
                "screenHeightPoints": 1051,
                "utcOffsetMinutes": 120,
                "userInterfaceTheme": "USER_INTERFACE_THEME_DARK",
                "connectionType": "CONN_CELLULAR_4G",
                "mainAppWebInfo": {
                    "graftUrl": "https://www.youtube.com/watch?v=" + videoId,
                    "webDisplayMode": "WEB_DISPLAY_MODE_BROWSER",
                    "isWebNativeShareAvailable": true
                },
                "playerType": "UNIPLAYER",
                "tvAppInfo": {
                    "livingRoomAppMode": "LIVING_ROOM_APP_MODE_UNSPECIFIED"
                },
                "clientScreen": "WATCH_FULL_SCREEN"
            },
            "user": {
                "lockedSafetyMode": false
            },
            "request": {
                "useSsl": true,
                "internalExperimentFlags": [],
                "consistencyTokenJars": []
            },
        },
        "playbackContext": {
            "contentPlaybackContext": {
                "html5Preference": "HTML5_PREF_WANTS",
                "lactMilliseconds": "2132",
                "referer": "https://www.youtube.com/watch?v=" + videoId,
                "signatureTimestamp": signatureTimestamp,
                "autoCaptionsDefaultOn": false,
                "autoplay": true,
                "mdxContext": {},
                "playerWidthPixels": 770,
                "playerHeightPixels": 433
            }
        },
        "captionParams": {},
        "racyCheckOk": true,
        "contentCheckOk": true
    }
}

const generateSidBasedAuth = function (sapisid, origin) {
    var timestamp = Math.floor(new Date().getTime() / 1000);
    var input = timestamp + " " + sapisid + " " + origin;
    var hash = crypto.createHash("sha1").update(input).digest("hex");
    return "SAPISIDHASH " + timestamp + "_" + hash;
}

const generatePlayerRequestHeaders = function (sapisid, psid) {
    var origin = "https://www.youtube.com";

    return {
        "Cookie": `SAPISID=${sapisid}; __Secure-3PAPISID=${sapisid}; __Secure-3PSID=${psid};`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36",
        "Content-Type": "application/json",
        "Authorization": generateSidBasedAuth(sapisid, origin),
        "X-Origin": origin,
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": "2.20210721.00.00",
        "Accept-Language": "en-US;q=0.8,en;q=0.7",
        "Origin": origin,
        "Referer": "https://www.youtube.com/watch?v=ENdgyD7Uar4"
    }
}

const getPlayer = function (videoId, clientName, clientVersion, signatureTimestamp, apiKey, sapisid, psid, proxy) {

    var url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
    var headers = generatePlayerRequestHeaders(sapisid, psid);
    var data = generatePlayerRequestData(videoId, clientName, clientVersion, signatureTimestamp);

    var axiosOptions = {
        method: "POST",
        url,
        headers,
        data: JSON.stringify(data),
        timeout: 5000
    }

    if (proxy) axiosOptions.httpsAgent = new httpsProxyAgent(proxy);

    return axios(axiosOptions);
}

module.exports = {
    getPlayer
}
