import { nativeJSONParse } from "../utils/natives";

export function getYtcfgValue(value) {
    return window.ytcfg?.get(value);
}

export function isUserLoggedIn() {
    return getYtcfgValue("LOGGED_IN") === true;
}

export function getPlayer(videoId) {
    const payload = getInnertubeEmbedPayload(videoId);
    return sendInnertubeRequest('v1/player', payload);
}

export function getNext(videoId, playlistId, playlistIndex) {
    const payload = getInnertubeEmbedPayload(videoId, playlistId, playlistIndex);
    return sendInnertubeRequest('v1/next', payload);
}

function sendInnertubeRequest(endpoint, payload) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/${endpoint}?key=${getYtcfgValue('INNERTUBE_API_KEY')}`, false);
    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

function getInnertubeEmbedPayload(videoId, playlistId, playlistIndex) {
    const payload = {
        context: {
            client: {
                clientName: getYtcfgValue('INNERTUBE_CLIENT_NAME').replace('_EMBEDDED_PLAYER', ''),
                clientVersion: getYtcfgValue('INNERTUBE_CLIENT_VERSION'),
                clientScreen: 'EMBED',
            },
            thirdParty: {
                embedUrl: "https://www.youtube.com/",
            },
        },
        playbackContext: {
            contentPlaybackContext: {
                signatureTimestamp: getYtcfgValue('STS'),
            },
        },
        videoId,
        playlistId,
        playlistIndex,
    };

    const innertubeContext = getYtcfgValue('INNERTUBE_CONTEXT');

    // Append client info from YT config (ytcfg)
    if (typeof innertubeContext?.client === "object") {
        payload.context.client = { ...payload.context.client, ...innertubeContext.client };
    }

    return payload;
}
