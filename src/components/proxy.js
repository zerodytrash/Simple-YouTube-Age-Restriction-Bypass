import { nativeJSONParse } from '../utils/natives';
import * as Config from '../config';

export function getGoogleVideoUrl(originalUrl) {
    return Config.VIDEO_PROXY_SERVER_HOST + '/direct/' + btoa(originalUrl);
}

export function getPlayer(payload) {
    const queryParams = new URLSearchParams(payload).toString();

    const proxyUrl = Config.ACCOUNT_PROXY_SERVER_HOST + '/getPlayer?' + queryParams;

    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', proxyUrl, false);
    xmlhttp.send(null);

    const playerResponse = nativeJSONParse(xmlhttp.responseText);

    // mark request as 'proxied'
    playerResponse.proxied = true;

    return playerResponse;
}
