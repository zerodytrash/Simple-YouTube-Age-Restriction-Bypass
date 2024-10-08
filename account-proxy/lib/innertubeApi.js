import crypto from 'node:crypto';

import { fetch } from 'undici';

const generateSidBasedAuth = function (sapisid) {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const hashInput = timestamp + " " + sapisid + " " + "https://www.youtube.com";
    const hashDigest = crypto.createHash("sha1").update(hashInput).digest("hex");
    return `SAPISIDHASH ${timestamp}_${hashDigest}`;
}

const generateApiRequestData = function (clientParams) {
    return {
        "videoId": clientParams.videoId,
        "context": {
            "client": {
                "hl": clientParams.hl,
                "gl": "US",
                "clientName": clientParams.clientName,
                "clientVersion": clientParams.clientVersion,
                "userInterfaceTheme": clientParams.userInterfaceTheme,
            },
        },
        "playbackContext": {
            "contentPlaybackContext": {
                "signatureTimestamp": clientParams.signatureTimestamp,
            }
        },
        "racyCheckOk": true,
        "contentCheckOk": true,
        "startTimeSecs": clientParams.startTimeSecs,
    }
}

const generateApiRequestHeaders = function (credentials) {
    return {
        "cookie": `SID=${credentials.SID}; HSID=${credentials.HSID}; SSID=${credentials.SSID}; APISID=${credentials.APISID}; SAPISID=${credentials.SAPISID}; __Secure-1PSIDTS=${credentials.PSIDTS};`,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        "content-type": "application/json",
        "authorization": generateSidBasedAuth(credentials.SAPISID),
        "origin": "https://www.youtube.com",
    }
}

const sendApiRequest = async function (endpoint, clientParams, credentials, proxyAgent) {
    const url = `https://www.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`;
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
