import { isObject } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';

export function attachInitialDataInterceptor(onInititalDataSet) {
    const tryHijackInitialData = () => {
        if (typeof window.getInitialData === 'function') {
            const originalGetInitialData = window.getInitialData;

            window.getInitialData = function () {
                let initialData = originalGetInitialData();

                // for some reason we need a deep copy of the object
                let initialDataCopy = nativeJSONParse(JSON.stringify(initialData));
                let initialDataProcessed = onInititalDataSet(initialDataCopy);

                return initialDataProcessed;
            };

            // on mobile the loading of the data must be triggered.
            if (typeof window.loadInitialData === 'function') {
                window.loadInitialData(window.getInitialData());
            }
        }
    };

    // The initial data is available as soon as the DOM is parsed (DOMContentLoaded) and as long as the YouTube app has not been initialized
    // However, some userscript managers use the DOMContentLoaded event to execute the script.
    // Therefore, in some cases, it must be tried immediately on execution.

    tryHijackInitialData();
    window.addEventListener('DOMContentLoaded', tryHijackInitialData);
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
