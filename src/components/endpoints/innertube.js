import Config from '../../config';
import { getYtcfgValue, isUserLoggedIn } from '../../utils';
import { nativeJSONParse } from '../interceptors/natives';
import * as storage from '../storage';

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
        Config.GOOGLE_AUTH_HEADER_NAMES.forEach((headerName) => {
            xmlhttp.setRequestHeader(headerName, storage.get(headerName));
        });
    }

    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

export default {
    getPlayer,
    getNext,
};
