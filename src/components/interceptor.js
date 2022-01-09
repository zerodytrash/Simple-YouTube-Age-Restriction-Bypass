import { isObject, isDesktop, createDeepCopy } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';
import * as logger from '../utils/logger';

export function attachInitialDataInterceptor(onInititalDataSet) {
    if (!isDesktop) {
        window.addEventListener('initialdata', () => {
            logger.info('Mobile initialData fired');
            onInititalDataSet(window.getInitialData());
        });
        return;
    }

    interceptProp(window, 'ytplayer', () => {
        if (window.ytInitialPlayerResponse) onInititalDataSet(window.ytInitialPlayerResponse);
    });
    interceptProp(window, 'ytInitialData', (value) => {
        if (value) onInititalDataSet(value);
    });

    function interceptProp(obj, prop, setter) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, prop) || {};

        let propValue = obj[prop];

        Object.defineProperty(obj, prop, {
            get: () => {
                descriptor.get?.call(obj);
                return propValue;
            },
            set: (value) => {
                if (value !== propValue) propValue = value;

                setter.call(obj, value);
                descriptor.set?.call(obj, propValue);
            },
            configurable: true,
        });
    }
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
