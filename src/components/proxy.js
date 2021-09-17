import { nativeJSONParse } from "../utils/natives";
import * as innertube from "./innertubeClient";
import * as Config from "../config";

export function getGoogleVideoUrl(originalUrl, proxyHost) {
    return proxyHost + "/direct/" + btoa(originalUrl);
}

export function getPlayer(videoId, reason) {
    const queryParams = new URLSearchParams({
        videoId,
        reason,
        clientName: innertube.getMainPageClientName(),
        clientVersion: innertube.getYtcfgValue('INNERTUBE_CLIENT_VERSION'),
        signatureTimestamp: innertube.getSignatureTimestamp(),
        isEmbed: +location.pathname.includes("/embed/")
    }).toString();

    const proxyUrl = Config.ACCOUNT_PROXY_SERVER_HOST + '/getPlayer?' + queryParams;

    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', proxyUrl, false);
    xmlhttp.send(null);

    const playerResponse = nativeJSONParse(xmlhttp.responseText);

    // mark request as 'proxied'
    playerResponse.proxied = true;

    return playerResponse;
}
