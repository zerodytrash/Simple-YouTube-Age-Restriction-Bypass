import { isObject, createDeepCopy } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';
import * as logger from '../utils/logger';

function interceptObjectProperty(prop, onSet) {
    // Allow other userscripts to decorate this descriptor, if they do something similar
    const dataKey = '__SYARB_' + prop;
    const { get: getter, set: setter } = Object.getOwnPropertyDescriptor(Object.prototype, prop) ?? {
        set(value) {
            this[dataKey] = value;
        },
        get() {
            return this[dataKey];
        },
    };

    // Intercept the given property on any object
    // The assigned attribute value and the context (enclosing object) are passed to the onSet function.
    Object.defineProperty(Object.prototype, prop, {
        set(value) {
            setter.call(this, isObject(value) ? onSet(this, value) : value);
        },
        get() {
            return getter.call(this);
        },
        configurable: true,
    });
}

export function attachInitialDataInterceptor(onInitialData) {
    // And here we deal with YouTube's crappy initial data (present in page source) and the problems that occur when intercepting that data.
    // YouTube has some protections in place that make it difficult to intercept and modify the global ytInitialPlayerResponse variable.
    // The easiest way would be to set a descriptor on that variable to change the value directly on declaration.
    // But some adblockers define their own descriptors on the ytInitialPlayerResponse variable, which makes it hard to register another descriptor on it.
    // As a workaround only the relevant playerResponse property of the ytInitialPlayerResponse variable will be intercepted.
    // This is achieved by defining a descriptor on the object prototype for that property, which affects any object with a `playerResponse` property.
    interceptObjectProperty('playerResponse', (obj, playerResponse) => {
        logger.info(`playerResponse property set, contains sidebar: ${!!obj.response}`);

        // The same object also contains the sidebar data and video description
        if (isObject(obj.response)) onInitialData(obj.response);

        // If the script is executed too late and the bootstrap data has already been processed,
        // a reload of the player can be forced by creating a deep copy of the object.
        // This is especially relevant if the userscript manager does not handle the `@run-at document-start` correctly.
        playerResponse.unlocked = false;
        onInitialData(playerResponse);
        return playerResponse.unlocked ? createDeepCopy(playerResponse) : playerResponse;
    });

    // The global `ytInitialData` variable can be modified on the fly.
    // It contains search results, sidebar data and meta information
    // Not really important but fixes https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/127
    window.addEventListener('DOMContentLoaded', () => {
        if (isObject(window.ytInitialData)) {
            onInitialData(window.ytInitialData);
        }
    });
}

// Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
export function attachJsonInterceptor(onJsonDataReceived) {
    window.JSON.parse = function () {
        const data = nativeJSONParse.apply(this, arguments);
        return isObject(data) ? onJsonDataReceived(data) : data;
    };
}

export function attachXhrOpenInterceptor(onXhrOpenCalled) {
    XMLHttpRequest.prototype.open = function (method, url) {
        if (typeof url === 'string' && url.indexOf('https://') === 0) {
            const modifiedUrl = onXhrOpenCalled(this, method, new URL(url));

            if (typeof modifiedUrl === 'string') {
                arguments[1] = modifiedUrl;
            }
        }

        nativeXMLHttpRequestOpen.apply(this, arguments);
    };
}
