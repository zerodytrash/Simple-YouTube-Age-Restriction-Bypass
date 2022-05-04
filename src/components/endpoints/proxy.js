import { nativeJSONParse } from '../../utils/natives';
import * as Config from '../../config';
import * as logger from '../../utils/logger';

function getGoogleVideoUrl(originalUrl) {
    return Config.VIDEO_PROXY_SERVER_HOST + '/direct/' + btoa(originalUrl);
}

function getPlayer(payload) {
    return sendRequest('getPlayer', payload);
}

function getNext(payload) {
    return sendRequest('getNext', payload);
}

function sendRequest(endpoint, payload) {
    const queryParams = new URLSearchParams(payload);
    const proxyUrl = `${Config.ACCOUNT_PROXY_SERVER_HOST}/${endpoint}?${queryParams}&client=js`;

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

export default {
    getPlayer,
    getNext,
    getGoogleVideoUrl,
};
