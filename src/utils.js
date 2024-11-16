export const nativeJSONParse = JSON.parse;
export const nativeXMLHttpRequestOpen = XMLHttpRequest.prototype.open;

export const isDesktop = location.host !== 'm.youtube.com';
export const isMusic = location.host === 'music.youtube.com';
export const isEmbed = location.pathname.indexOf('/embed/') === 0;
export const isConfirmed = location.search.includes('unlock_confirmed');

// Some Innertube bypass methods require the following authentication headers of the currently logged in user.
export const GOOGLE_AUTH_HEADER_NAMES = ['Authorization', 'X-Goog-AuthUser', 'X-Origin'];

// WORKAROUND: TypeError: Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment.
if (window.trustedTypes) {
    if (!window.trustedTypes.defaultPolicy) {
        const passThroughFn = (x) => x;
        window.trustedTypes.createPolicy('default', {
            createHTML: passThroughFn,
            createScriptURL: passThroughFn,
            createScript: passThroughFn,
        });
    }
}

export function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}

export function pageLoaded() {
    if (document.readyState === 'complete') return Promise.resolve();

    const { promise, resolve } = Promise.withResolvers();

    window.addEventListener('load', resolve, { once: true });

    return promise;
}

export function createDeepCopy(obj) {
    return nativeJSONParse(JSON.stringify(obj));
}

export function getYtcfgValue(name) {
    return window.ytcfg?.get(name);
}

export function getSignatureTimestamp() {
    return (
        getYtcfgValue('STS')
        || (() => {
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

export function isUserLoggedIn() {
    // LOGGED_IN doesn't exist on embedded page, use DELEGATED_SESSION_ID or SESSION_INDEX as fallback
    if (typeof getYtcfgValue('LOGGED_IN') === 'boolean') return getYtcfgValue('LOGGED_IN');
    if (typeof getYtcfgValue('DELEGATED_SESSION_ID') === 'string') return true;
    if (parseInt(getYtcfgValue('SESSION_INDEX')) >= 0) return true;

    return false;
}

export function waitForElement(elementSelector, timeout) {
    const { promise, resolve, reject } = Promise.withResolvers();

    const checkDomInterval = setInterval(() => {
        const elem = document.querySelector(elementSelector);
        if (elem) {
            clearInterval(checkDomInterval);
            resolve(elem);
        }
    }, 100);

    if (timeout) {
        setTimeout(() => {
            clearInterval(checkDomInterval);
            reject();
        }, timeout);
    }

    return promise;
}
