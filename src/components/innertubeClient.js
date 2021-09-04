import { nativeJSONParse } from "../utils/natives";
import * as innertubeConfig from "./innertubeConfig";

function getInnertubeEmbedPayload(videoId, playlistId, playlistIndex) {
    const ytConfig = innertubeConfig.get();
    const payload = {
        context: {
            client: {
                clientName: ytConfig.INNERTUBE_CLIENT_NAME.replace('_EMBEDDED_PLAYER', ''),
                clientVersion: ytConfig.INNERTUBE_CLIENT_VERSION,
                clientScreen: "EMBED",
            },
            thirdParty: {
                embedUrl: "https://www.youtube.com/",
            },
        },
        playbackContext: {
            contentPlaybackContext: {
                signatureTimestamp: ytConfig.STS,
            },
        },
        videoId,
        playlistId,
        playlistIndex,
    };

    // Append client info from INNERTUBE_CONTEXT
    if (typeof ytConfig.INNERTUBE_CONTEXT?.client === "object") {
        payload.context.client = { ...payload.context.client, ...ytConfig.INNERTUBE_CONTEXT.client };
    }

    return payload;
}

export function sendInnertubeRequest(endpoint, payload) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/${endpoint}?key=${innertubeConfig.get().INNERTUBE_API_KEY}`, false);
    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

export function getPlayer(videoId) {
    const payload = getInnertubeEmbedPayload(videoId);
    return sendInnertubeRequest("v1/player", payload);
}

export function getNext(videoId, playlistId, playlistIndex) {
    const payload = getInnertubeEmbedPayload(videoId, playlistId, playlistIndex);
    return sendInnertubeRequest("v1/next", payload);
}
