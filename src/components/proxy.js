import { nativeJSONParse } from "../utils/natives";
import * as innertubeConfig from "./innertubeConfig";
import * as Config from "../config";

export function getProxiedGooglevideoUrl(originalUrl, proxyHost) {
    return proxyHost + "/direct/" + btoa(originalUrl);
}

export function getPlayerFromAccountProxy(videoId, reason) {
    const ytConfig = innertubeConfig.get();
    const queryParams = new URLSearchParams({
        videoId,
        reason,
        clientName: ytConfig.INNERTUBE_CLIENT_NAME,
        clientVersion: ytConfig.INNERTUBE_CLIENT_VERSION,
        signatureTimestamp: ytConfig.STS
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
