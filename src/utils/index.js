import { nativeJSONParse } from './natives';

export const isDesktop = window.location.host !== 'm.youtube.com';
export const isMusic = window.location.host === 'music.youtube.com';
export const isEmbed = window.location.pathname.indexOf('/embed/') === 0;
export const isConfirmed = window.location.search.includes('unlock_confirmed');

export class Deferred {
    constructor() {
        return Object.assign(
            new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            }),
            this
        );
    }
}

export function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}

export function isObject(obj) {
    return obj !== null && typeof obj === 'object';
}

export function findNestedObjectsByAttributeNames(object, attributeNames) {
    var results = [];

    // Does the current object match the attribute conditions?
    if (attributeNames.every((key) => typeof object[key] !== 'undefined')) {
        results.push(object);
    }

    // Diggin' deeper for each nested object (recursive)
    Object.keys(object).forEach((key) => {
        if (object[key] && typeof object[key] === 'object') {
            results.push(...findNestedObjectsByAttributeNames(object[key], attributeNames));
        }
    });

    return results;
}

export function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export function pageLoaded() {
    if (document.readyState === 'complete') return Promise.resolve();

    const deferred = new Deferred();

    window.addEventListener('load', deferred.resolve, { once: true });

    return deferred;
}

export function createDeepCopy(obj) {
    return nativeJSONParse(JSON.stringify(obj));
}

export function getCurrentVideoStartTime(currentVideoId) {
    // Check if the URL corresponds to the requested video
    // This is not the case when the player gets preloaded for the next video in a playlist.
    if (window.location.href.includes(currentVideoId)) {
        // "t"-param on youtu.be urls
        // "start"-param on embed player
        // "time_continue" when clicking "watch on youtube" on embedded player
        const urlParams = new URLSearchParams(window.location.search);
        const startTimeString = (urlParams.get('t') || urlParams.get('start') || urlParams.get('time_continue'))?.replace('s', '');

        if (startTimeString && !isNaN(startTimeString)) {
            return parseInt(startTimeString);
        }
    }

    return 0;
}

export function setUrlParams(params) {
    const urlParams = new URLSearchParams(window.location.search);
    for (paramName in params) {
        urlParams.set(paramName, params[paramName]);
    }
    window.location.search = urlParams;
}

export function waitForElement(elementSelector, timeout) {
    const deferred = new Deferred();

    const checkDomInterval = setInterval(() => {
        const elem = document.querySelector(elementSelector);
        if (elem) {
            clearInterval(checkDomInterval);
            deferred.resolve(elem);
        }
    }, 100);

    if (timeout) {
        setTimeout(() => {
            clearInterval(checkDomInterval);
            deferred.reject();
        }, timeout);
    }

    return deferred;
}
