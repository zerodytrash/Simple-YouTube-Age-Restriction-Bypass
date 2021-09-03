import { nativeJSONParse } from "../utils/natives";
import * as innertubeClient from "./innertubeClient";
import * as Config from "../config";

export function getProxiedGooglevideoUrl(originalUrl, proxyHost) {
    return proxyHost + "/direct/" + btoa(originalUrl);
}

export function getPlayerFromAccountProxy(videoId, reason) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", Config.ACCOUNT_PROXY_SERVER_HOST + `/getPlayer?videoId=${encodeURIComponent(videoId)}&reason=${encodeURIComponent(reason)}&clientName=${innertubeClient.getConfig().INNERTUBE_CLIENT_NAME}&clientVersion=${innertubeClient.getConfig().INNERTUBE_CLIENT_VERSION}&signatureTimestamp=${innertubeClient.getConfig().STS}`, false); // Synchronous!!!
    xmlhttp.send(null);
    const playerResponse = nativeJSONParse(xmlhttp.responseText);
    playerResponse.proxied = true;
    return playerResponse;
}
