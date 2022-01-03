import { isObject, isDesktop } from '../utils';
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
    // `getInitialData` is only available a little earlier and a little later than `DOMContentLoaded`
    // As long as YouTube has not fully initialized, `getInitialData` is defined
    window.addEventListener('DOMContentLoaded', () => {
        window.getInitialData &&= new Proxy(window.getInitialData, {
            apply(target) {
                logger.info('Desktop initialData fired');
                return onInititalDataSet(JSON.parse(JSON.stringify(target())));
            },
        });
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
