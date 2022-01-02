import { isObject, isDesktop } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';
import * as logger from '../utils/logger';

let originalGetInitialData;

export function attachInitialDataInterceptor(onInititalDataSet) {
    const tryHijackInitialData = (event) => {
        try {
            if (isDesktop && !originalGetInitialData && typeof window.getInitialData === 'function') {
                originalGetInitialData = window.getInitialData;

                window.getInitialData = () => {
                    // for some reason we need a deep copy of the object
                    let initialData = originalGetInitialData();
                    let initialDataCopy = nativeJSONParse(JSON.stringify(initialData));

                    onInititalDataSet(initialDataCopy);
                    logger.info('Desktop initialData processed!');

                    return initialDataCopy;
                };

                logger.info(`'getInitialData' overwritten! Trigger: ${event?.type ?? 'direct'}`);
            } else if (event?.type === 'initialdata') {
                onInititalDataSet(window.getInitialData());
                logger.info('Mobile initialData processed!');
            }
        } catch (err) {
            logger.error(err, `Error while handling initial data. Trigger: ${event?.type ?? 'direct'}`);
        }
    };

    // The initial data is available on Deskop as soon as the DOM is parsed (DOMContentLoaded) and as long as the YouTube app has not been initialized
    // However, some userscript managers use the DOMContentLoaded event to execute the script.
    // Therefore, in some cases, it must be tried immediately on execution.
    // On mobile there is a special 'initialdata' event

    tryHijackInitialData();
    window.addEventListener('DOMContentLoaded', tryHijackInitialData);
    window.addEventListener('initialdata', tryHijackInitialData);
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
