import { isObject, createDeepCopy } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';
import * as logger from '../utils/logger';

function interceptObject(proto, prop, onSet) {
    // Allow other userscripts to decorate this descriptor, if they do something similar to this as well
    const symbol = Symbol.for('SYARB' + prop);
    const { get: getter, set: setter } = Object.getOwnPropertyDescriptor(proto, prop) ?? {
        set(value) {
            this[symbol] = value;
        },
        get() {
            return this[symbol];
        },
    };

    Object.defineProperty(proto, prop, {
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
    interceptObject(Object.prototype, 'playerResponse', (obj, playerResponse) => {
        logger.info(`playerResponse property set, contains sidebar: ${!!obj.response}`);

        // The same object also contains the sidebar data and video description
        if (isObject(obj.response)) onInitialData(obj.response);

        // If the script is executed too late and the bootstrap data has already been processed,
        // a reload of the player can be forced by creating a deep copy of the object.
        playerResponse.unlocked = false;
        onInitialData(playerResponse);
        return playerResponse.unlocked ? createDeepCopy(playerResponse) : playerResponse;
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
                url = modifiedUrl;
            }
        }

        nativeXMLHttpRequestOpen.apply(this, arguments);
    };
}
