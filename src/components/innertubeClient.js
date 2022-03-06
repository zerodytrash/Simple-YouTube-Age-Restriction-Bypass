import { nativeJSONParse } from '../utils/natives';
import { generateSha1Hash } from '../utils/sha1';
import { getCookie } from '../utils';

export function getYtcfgValue(name) {
    return window.ytcfg?.get(name);
}

export function isUserLoggedIn() {
    // Session Cookie exists?
    if (!getSidCookie()) return false;

    // LOGGED_IN doesn't exist on embedded page, use DELEGATED_SESSION_ID as fallback
    if (typeof getYtcfgValue('LOGGED_IN') === 'boolean') return getYtcfgValue('LOGGED_IN');
    if (typeof getYtcfgValue('DELEGATED_SESSION_ID') === 'string') return true;

    return false;
}

export function getPlayer(payload, requiresAuth) {
    return sendInnertubeRequest('v1/player', payload, requiresAuth);
}

export function getNext(payload) {
    return sendInnertubeRequest('v1/next', payload, false);
}

export function getSignatureTimestamp() {
    return (
        getYtcfgValue('STS') ||
        (() => {
            // STS is missing on embedded player. Retrieve from player base script as fallback...
            const playerBaseJsPath = document.querySelector('script[src*="/base.js"]')?.src;

            if (!playerBaseJsPath) return;

            const xmlhttp = new XMLHttpRequest();
            xmlhttp.open('GET', playerBaseJsPath, false);
            xmlhttp.send(null);

            return parseInt(xmlhttp.responseText.match(/signatureTimestamp:([0-9]*)/)[1]);
        })()
    );
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

function getSidCookie() {
    return getCookie('SAPISID') || getCookie('__Secure-3PAPISID');
}

function generateSidBasedAuth() {
    const sid = getSidCookie();
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const input = timestamp + ' ' + sid + ' ' + location.origin;
    const hash = generateSha1Hash(input);
    return `SAPISIDHASH ${timestamp}_${hash}`;
}
