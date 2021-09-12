import { nativeJSONParse } from "../utils/natives";
import * as utils from "../utils";
import * as logger from "../utils/logger";

export function getYtcfgValue(value) {
    return window.ytcfg?.get(value);
}

export function isUserLoggedIn() {
    return getYtcfgValue("LOGGED_IN") === true && getSidCookie() !== undefined;
}

export function getPlayer(videoId, clientConfig, useAuth) {
    if (useAuth && !isUserLoggedIn()) return;
    const payload = getInnertubeEmbedPayload(videoId, clientConfig);
    return sendInnertubeRequest('v1/player', payload, useAuth);
}

export function getNext(videoId, clientConfig, playlistId, playlistIndex) {
    const payload = getInnertubeEmbedPayload(videoId, clientConfig, playlistId, playlistIndex);
    return sendInnertubeRequest('v1/next', payload, false);
}

function sendInnertubeRequest(endpoint, payload, useAuth) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/${endpoint}?key=${getYtcfgValue('INNERTUBE_API_KEY')}`, false);
    if (useAuth) {
        xmlhttp.withCredentials = true;
        xmlhttp.setRequestHeader("Authorization", generateSidBasedAuth());
    }
    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

function getInnertubeEmbedPayload(videoId, clientConfig, playlistId, playlistIndex) {
    const payload = {
        context: {
            client: {
                ...getYtcfgValue('INNERTUBE_CONTEXT').client,
                ...clientConfig || {}
            },
            thirdParty: {
                embedUrl: "https://www.youtube.com/",
            },
        },
        playbackContext: {
            contentPlaybackContext: {
                // STS is missing on embedded player :(
                signatureTimestamp: getYtcfgValue('STS') || getSignatureTimestampFromPlayerBase(),
            },
        },
        videoId,
        playlistId,
        playlistIndex,
    };

    // replace embedded client with YouTube's main page client (e.g. WEB_EMBEDDED_PLAYER => WEB)
    payload.context.client.clientName = payload.context.client.clientName.replace('_EMBEDDED_PLAYER', '');

    return payload;
}

function getSignatureTimestampFromPlayerBase() {

    const getPlayerBaseJsPath = (propSuffix) => {
        return getYtcfgValue("WEB_PLAYER_CONTEXT_CONFIGS")?.["WEB_PLAYER_CONTEXT_CONFIG_ID_" + propSuffix]?.jsUrl;
    }

    // YouTube main page, mobile, embedded player
    const playerBaseJsPath = getPlayerBaseJsPath("KEVLAR_WATCH") || getPlayerBaseJsPath("MWEB_WATCH") || getPlayerBaseJsPath("EMBEDDED_PLAYER");

    logger.info(`Retrieving signatureTimestamp from ${playerBaseJsPath} ...`);

    if (!playerBaseJsPath) return;

    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", playerBaseJsPath, false);
    xmlhttp.send(null);

    return parseInt(xmlhttp.responseText.match(/signatureTimestamp:([0-9]*)/)[1]);
}

function getSidCookie() {
    return utils.getCookie('SAPISID') || utils.getCookie('__Secure-3PAPISID');
}

function generateSidBasedAuth() {
    const sid = getSidCookie();
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const input = timestamp + " " + sid + " " + location.origin;
    const hash = utils.generateSha1Hash(input);
    return "SAPISIDHASH " + timestamp + "_" + hash;
}
