import { getYtcfgValue, isUserLoggedIn } from '../../utils';
import { nativeJSONParse } from '../../utils/natives';
import * as authStorage from '../authStorage';

function getPlayer(payload, useAuth) {
    return sendInnertubeRequest('v1/player', payload, useAuth);
}

function getNext(payload, useAuth) {
    return sendInnertubeRequest('v1/next', payload, useAuth);
}

function sendInnertubeRequest(endpoint, payload, useAuth) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('POST', `/youtubei/${endpoint}?key=${getYtcfgValue('INNERTUBE_API_KEY')}&prettyPrint=false`, false);
    if (useAuth && isUserLoggedIn()) {
        xmlhttp.withCredentials = true;
        xmlhttp.setRequestHeader('Authorization', authStorage.get().authorizationToken || '');
        xmlhttp.setRequestHeader('X-Goog-AuthUser', authStorage.get().authUser || '0');
    }
    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

export default {
    getPlayer,
    getNext,
};
