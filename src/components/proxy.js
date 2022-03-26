import { nativeJSONParse } from '../utils/natives';
import * as Config from '../config';
import * as logger from '../utils/logger';

export function getGoogleVideoUrl(originalUrl) {
    return Config.VIDEO_PROXY_SERVER_HOST + '/direct/' + btoa(originalUrl);
}

export function sendRequest(endpoint, payload) {
    const queryParams = new URLSearchParams(payload);
    const proxyUrl = `${Config.ACCOUNT_PROXY_SERVER_HOST}/${endpoint}?${queryParams}`;

    try {
        const xmlhttp = new XMLHttpRequest();
        xmlhttp.open('GET', proxyUrl, false);
        xmlhttp.send(null);

        const proxyResponse = nativeJSONParse(xmlhttp.responseText);

        // mark request as 'proxied'
        proxyResponse.proxied = true;

        return proxyResponse;
    } catch (err) {
        logger.error(err, 'Proxy API Error');
        return { errorMessage: 'Proxy Connection failed' };
    }
}

export function getPlayer(payload) {
    return sendRequest('getPlayer', payload);
}

export function getNext(payload) {
    return sendRequest('getNext', payload);
}
