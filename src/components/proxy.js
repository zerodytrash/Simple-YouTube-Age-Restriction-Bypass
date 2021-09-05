import { nativeJSONParse } from "../utils/natives";
import { getYtcfgValue } from "./innertubeClient";
import * as Config from "../config";

export function getProxiedGooglevideoUrl(originalUrl, proxyHost) {
    return proxyHost + "/direct/" + btoa(originalUrl);
}

export function getPlayerFromAccountProxy(videoId, reason) {
    const queryParams = new URLSearchParams({
        videoId,
        reason,
        clientName: getYtcfgValue('INNERTUBE_CLIENT_NAME'),
        clientVersion: getYtcfgValue('INNERTUBE_CLIENT_VERSION'),
        signatureTimestamp: getYtcfgValue('STS')
    }).toString()

    const proxyUrl = Config.ACCOUNT_PROXY_SERVER_HOST + '/getPlayer?' + queryParams;

    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', proxyUrl, false);
    xmlhttp.send(null);

    const playerResponse = nativeJSONParse(xmlhttp.responseText);

    // mark request as 'proxied'
    playerResponse.proxied = true;

    return playerResponse;
}
