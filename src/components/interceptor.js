import { isObject } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';

export function attachInitialDataInterceptor(onInititalDataSet) {
    let getInitialDataFn;

    Object.defineProperty(window, 'getInitialData', {
        get: () => {
            if (typeof getInitialDataFn === 'function') {
                let initalData = getInitialDataFn();

                // for some reason we need a deep copy of the object
                initalData = nativeJSONParse(JSON.stringify(initalData));
                initalData = onInititalDataSet(initalData);

                return () => {
                    return initalData;
                };
            }
        },
        set: (fn) => {
            getInitialDataFn = fn;
        },
        configurable: true
    });
}

// Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
export function attachJsonInterceptor(onJsonDataReceived) {
    window.JSON.parse = (text, reviver) => {
        const data = nativeJSONParse(text, reviver);
        return !isObject(data) ? data : onJsonDataReceived(data);
    };
}

export function attachXhrOpenInterceptor(onXhrOpenCalled) {
    XMLHttpRequest.prototype.open = function (method, url) {
        if (arguments.length > 1 && typeof url === 'string' && url.indexOf('https://') === 0) {
            const modifiedUrl = onXhrOpenCalled(this, method, new URL(url));

            if (typeof modifiedUrl === 'string') {
                url = modifiedUrl;
            }
        }

        nativeXMLHttpRequestOpen.apply(this, arguments);
    };
}
