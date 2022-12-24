import crypto from 'node:crypto';

import { fetch } from 'undici';

const generateApiRequestData = function (clientParams) {
    return {
        "videoId": clientParams.videoId,
        "context": {
            "client": {
                "hl": clientParams.hl,
                "gl": "US",
                "deviceMake": "",
                "deviceModel": "",
                "visitorData": "CgtIZDE3aXJqLXFwNCiZpPaHBg%3D%3D",
                "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36,gzip(gfe)",
                "clientName": clientParams.clientName,
                "clientVersion": clientParams.clientVersion,
                "osName": "Windows",
                "osVersion": "10.0",
                "originalUrl": "https://www.youtube.com/watch?v=" + clientParams.videoId,
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
                    "graftUrl": "https://www.youtube.com/watch?v=" + clientParams.videoId,
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
                "referer": "https://www.youtube.com/watch?v=" + clientParams.videoId,
                "signatureTimestamp": clientParams.signatureTimestamp,
                "autoCaptionsDefaultOn": false,
                "autoplay": true,
                "mdxContext": {},
                "playerWidthPixels": 770,
                "playerHeightPixels": 433
            }
        },
        "captionParams": {},
        "racyCheckOk": true,
        "contentCheckOk": true,
        "startTimeSecs": clientParams.startTimeSecs,
    }
}

const generateSidBasedAuth = function (sapisid, origin) {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const hashInput = timestamp + " " + sapisid + " " + origin;
    const hashDigest = crypto.createHash("sha1").update(hashInput).digest("hex");
    return `SAPISIDHASH ${timestamp}_${hashDigest}`;
}

const generateApiRequestHeaders = function (credentials) {
    const origin = "https://www.youtube.com";

    return {
        "Cookie": `SID=${credentials.SID}; HSID=${credentials.HSID}; SSID=${credentials.SSID}; APISID=${credentials.APISID}; SAPISID=${credentials.SAPISID};`,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.164 Safari/537.36",
        "Content-Type": "application/json",
        "Authorization": generateSidBasedAuth(credentials.SAPISID, origin),
        "X-Origin": origin,
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": "2.20210721.00.00",
        "Accept-Language": "en-US;q=0.8,en;q=0.7",
        "Origin": origin,
        "Referer": "https://www.youtube.com/watch?v=ENdgyD7Uar4"
    }
}

const sendApiRequest = async function (endpoint, clientParams, credentials, proxyAgent) {

    const url = `https://www.youtube.com/youtubei/v1/${endpoint}?key=${credentials.API_KEY}&prettyPrint=false`;
    const headers = generateApiRequestHeaders(credentials);
    const data = generateApiRequestData(clientParams);

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        dispatcher: proxyAgent,
        signal: AbortSignal.timeout(5000),
    });

    return res.json();
}

export default {
    sendApiRequest
}
