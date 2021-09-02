import { nativeParse } from "./interceptor";

// YouTube API config (Innertube).
// The actual values will be determined later from the global ytcfg variable => setInnertubeConfigFromYtcfg()
const INNERTUBE_CONFIG = {
    INNERTUBE_API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    INNERTUBE_CLIENT_NAME: "WEB",
    INNERTUBE_CLIENT_VERSION: "2.20210721.00.00",
    INNERTUBE_CONTEXT: {},
    STS: 18834, // signatureTimestamp (relevant for the cipher functions)
    LOGGED_IN: false,
};

let configRefreshed = false;

// to avoid version conflicts between client and server response, the current YouTube version config will be determined
function setInnertubeConfigFromYtcfg() {
    if (!window.ytcfg) {
        console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration (window.ytcfg). Using old values...");
        return;
    }

    for (const key in INNERTUBE_CONFIG) {
        const value = window.ytcfg.data_?.[key] ?? window.ytcfg.get?.(key);
        if (value !== undefined && value !== null) {
            INNERTUBE_CONFIG[key] = value;
        } else {
            console.warn(`Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration variable '${key}'. Using old value...`);
        }
    }
}

export function getConfig() {
    if (!configRefreshed) {
        setInnertubeConfigFromYtcfg();
        configRefreshed = true;
    }
    return INNERTUBE_CONFIG;
}

function getInnertubeEmbedPayload(videoId, playlistId, playlistIndex) {
    const payload = {
        context: {
            client: {
                clientName: getConfig().INNERTUBE_CLIENT_NAME.replace('_EMBEDDED_PLAYER', ''),
                clientVersion: getConfig().INNERTUBE_CLIENT_VERSION,
                clientScreen: "EMBED",
            },
            thirdParty: {
                embedUrl: "https://www.youtube.com/",
            },
        },
        playbackContext: {
            contentPlaybackContext: {
                signatureTimestamp: getConfig().STS,
            },
        },
        videoId,
        playlistId,
        playlistIndex,
    };

    // Append client info from INNERTUBE_CONTEXT
    if (typeof getConfig().INNERTUBE_CONTEXT?.client === "object") {
        payload.context.client = { ...payload.context.client, ...getConfig().INNERTUBE_CONTEXT.client };
    }

    return payload;
}

export function getPlayer(videoId) {
    const payload = getInnertubeEmbedPayload(videoId);
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/v1/player?key=${getConfig().INNERTUBE_API_KEY}`, false); // Synchronous!!!
    xmlhttp.send(JSON.stringify(payload));
    return nativeParse(xmlhttp.responseText);
}

export function getNext(videoId, playlistId, playlistIndex) {
    const payload = getInnertubeEmbedPayload(videoId, playlistId, playlistIndex);
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/v1/next?key=${getConfig().INNERTUBE_API_KEY}`, false); // Synchronous!!!
    xmlhttp.send(JSON.stringify(payload));
    return nativeParse(xmlhttp.responseText);
}