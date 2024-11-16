import { getYtcfgValue, GOOGLE_AUTH_HEADER_NAMES, isUserLoggedIn, nativeJSONParse } from '../utils.js';

const getPlayer = sendInnertubeRequest.bind(null, 'v1/player');
const getNext = sendInnertubeRequest.bind(null, 'v1/next');

function sendInnertubeRequest(endpoint, payload, useAuth) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('POST', `/youtubei/${endpoint}?key=${getYtcfgValue('INNERTUBE_API_KEY')}&prettyPrint=false`, false);

    if (useAuth && isUserLoggedIn()) {
        xmlhttp.withCredentials = true;
        GOOGLE_AUTH_HEADER_NAMES.forEach((headerName) => {
            const value = localStorage.getItem('SYARB_' + headerName);
            if (value) {
                xmlhttp.setRequestHeader(headerName, JSON.parse(value));
            }
        });
    }

    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
}

export default {
    getPlayer,
    getNext,
};
