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
    return {
        context: {
            client: {
                ...getYtcfgValue('INNERTUBE_CONTEXT').client,
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
}
