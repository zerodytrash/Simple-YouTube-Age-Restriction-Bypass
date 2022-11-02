import Config from '../../config';
import { isEmbed, isMusic } from '../../utils';
import * as logger from '../../utils/logger';
import { nativeJSONParse } from '../interceptors/natives';

let nextResponseCache = {};

function getGoogleVideoUrl(originalUrl) {
    return Config.VIDEO_PROXY_SERVER_HOST + '/direct/' + btoa(originalUrl.toString());
}

function getPlayer(payload) {
    // Also request the /next response if a later /next request is likely.
    if (!nextResponseCache[payload.videoId] && !isMusic && !isEmbed) {
        payload.includeNext = 1;
    }

    return sendRequest('getPlayer', payload);
}

function getNext(payload) {
    // Next response already cached? => Return cached content
    if (nextResponseCache[payload.videoId]) {
        return nextResponseCache[payload.videoId];
    }

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

        // Mark request as 'proxied'
        proxyResponse.proxied = true;

        // Put included /next response in the cache
        if (proxyResponse.nextResponse) {
            nextResponseCache[payload.videoId] = proxyResponse.nextResponse;
            delete proxyResponse.nextResponse;
        }

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
