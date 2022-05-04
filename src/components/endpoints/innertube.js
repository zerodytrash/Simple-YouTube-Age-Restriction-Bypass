import { getYtcfgValue, isUserLoggedIn, generateSidBasedAuth } from '../../utils';
import { nativeJSONParse } from '../../utils/natives';

function getPlayer(payload, requiresAuth) {
    return sendInnertubeRequest('v1/player', payload, requiresAuth);
}

function getNext(payload) {
    return sendInnertubeRequest('v1/next', payload, false);
}

function sendInnertubeRequest(endpoint, payload, useAuth) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('POST', `/youtubei/${endpoint}?key=${getYtcfgValue('INNERTUBE_API_KEY')}`, false);
    if (useAuth && isUserLoggedIn()) {
        xmlhttp.withCredentials = true;
        xmlhttp.setRequestHeader('Authorization', generateSidBasedAuth());
    }
    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

export default {
    getPlayer,
    getNext,
};
