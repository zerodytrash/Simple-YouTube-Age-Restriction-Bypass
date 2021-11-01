import { isObject } from '../utils';
import { nativeJSONParse, nativeXMLHttpRequestOpen } from '../utils/natives';

function interceptProp(obj, prop, { setter }) {
    // Compatibility: Backup getter/setter, may be defined by other extensions like AdBlock
    const { get, set } = Object.getOwnPropertyDescriptor(obj, prop) || {};

    let prevValue;

    Object.defineProperty(obj, prop, {
        set: (value) => {
            // prettier-ignore
            // eslint-disable-next-line no-empty
            if (set) try { set.call(obj, value) } catch (err) { }

            // prevent recursive setter calls by ignoring unchanged object reference
            if (value === prevValue) return;

            setter?.call(obj, value);
            prevValue = value;
        },
        get: () => {
            // prettier-ignore
            // eslint-disable-next-line no-empty
            if (get) try { return get.call(obj) } catch (err) { }
            return prevValue || {};
        },
        configurable: true,
    });
}

export function attachInitialDataInterceptor(callback) {
    const setter = (value) => (callback(value) || {});

    interceptProp(window, 'ytInitialPlayerResponse', { setter });
    interceptProp(window, 'ytInitialData', { setter });
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
