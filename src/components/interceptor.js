import { isObject } from "../utils";
import { nativeJSONParse, nativeObjectDefineProperty, nativeXMLHttpRequestOpen } from "../utils/natives";
import * as Config from "../config"

let wrappedPlayerResponse;
let wrappedNextResponse;

export function attachInitialDataInterceptor(onInititalDataSet) {

    // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
    let { get: chainedPlayerGetter, set: chainedPlayerSetter } = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse") || {};

    // Just for compatibility: Intercept (re-)definitions on YouTube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
    Object.defineProperty = (obj, prop, descriptor) => {
        if (obj === window && Config.PLAYER_RESPONSE_ALIASES.includes(prop)) {
            console.info("Another extension tries to redefine '" + prop + "' (probably an AdBlock extension). Chain it...");

            if (descriptor?.set) chainedPlayerSetter = descriptor.set;
            if (descriptor?.get) chainedPlayerGetter = descriptor.get;
        } else {
            nativeObjectDefineProperty(obj, prop, descriptor);
        }
    };

    // Redefine 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
    nativeObjectDefineProperty(window, "ytInitialPlayerResponse", {
        set: (playerResponse) => {
            // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by Brave browser shield)
            if (playerResponse === wrappedPlayerResponse) return;

            wrappedPlayerResponse = isObject(playerResponse) ? onInititalDataSet(playerResponse) : playerResponse;
            if (typeof chainedPlayerSetter === "function") chainedPlayerSetter(wrappedPlayerResponse);
        },
        get: () => {
            // eslint-disable-next-line no-empty
            if (typeof chainedPlayerGetter === "function") try { return chainedPlayerGetter() } catch (err) { }
            return wrappedPlayerResponse || {};
        },
        configurable: true,
    });

    // Also redefine 'ytInitialData' for the initial next/sidebar response
    nativeObjectDefineProperty(window, "ytInitialData", {
        set: (nextResponse) => { wrappedNextResponse = isObject(nextResponse) ? onInititalDataSet(nextResponse) : nextResponse; },
        get: () => wrappedNextResponse,
        configurable: true,
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
        if (arguments.length > 1 && typeof url === "string" && url.indexOf("https://") === 0) {
            const modifiedUrl = onXhrOpenCalled(this, method, new URL(url));

            if (typeof modifiedUrl === "string") {
                url = modifiedUrl;
            }
        }

        nativeXMLHttpRequestOpen.apply(this, arguments);
    };
}
