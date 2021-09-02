import { getNativeDefineProperty } from "../utils";
import * as Config from "../config"

export const nativeParse = window.JSON.parse; // Backup the original parse function
const nativeDefineProperty = getNativeDefineProperty(); // Backup the original defineProperty function to intercept setter & getter on the ytInitialPlayerResponse
const nativeXmlHttpOpen = XMLHttpRequest.prototype.open;

let wrappedPlayerResponse;
let wrappedNextResponse;

export function attachInititalDataInterceptor(onInititalDataSet) {

    // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
    let { get: chainedPlayerGetter, set: chainedPlayerSetter } = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse") || {};

    // Just for compatibility: Intercept (re-)definitions on YouTube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
    Object.defineProperty = (obj, prop, descriptor) => {
        if (obj === window && Config.PLAYER_RESPONSE_ALIASES.includes(prop)) {
            console.info("Another extension tries to redefine '" + prop + "' (probably an AdBlock extension). Chain it...");

            if (descriptor?.set) chainedPlayerSetter = descriptor.set;
            if (descriptor?.get) chainedPlayerGetter = descriptor.get;
        } else {
            nativeDefineProperty(obj, prop, descriptor);
        }
    };

    // Redefine 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
    nativeDefineProperty(window, "ytInitialPlayerResponse", {
        set: (playerResponse) => {
            // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by Brave browser shield)
            if (playerResponse === wrappedPlayerResponse) return;

            wrappedPlayerResponse = onInititalDataSet(playerResponse);
            if (typeof chainedPlayerSetter === "function") chainedPlayerSetter(wrappedPlayerResponse);
        },
        get: () => {
            if (typeof chainedPlayerGetter === "function") try { return chainedPlayerGetter() } catch (err) { };
            return wrappedPlayerResponse || {};
        },
        configurable: true,
    });

    // Also redefine 'ytInitialData' for the initial next/sidebar response
    nativeDefineProperty(window, "ytInitialData", {
        set: (nextResponse) => { wrappedNextResponse = onInititalDataSet(nextResponse); },
        get: () => wrappedNextResponse,
        configurable: true,
    });
}

// Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
export function attachJsonInterceptor(onJsonDataReceived) {
    window.JSON.parse = (text, reviver) => onJsonDataReceived(nativeParse(text, reviver));
}

export function attachXhrOpenInterceptor(onXhrOpenCalled) {
    XMLHttpRequest.prototype.open = function () {
        if (arguments.length > 1 && typeof arguments[1] === "string" && arguments[1].indexOf("https://") === 0) {
            const method = arguments[0];
            const url = new URL(arguments[1]);
            const urlParams = new URLSearchParams(url.search);

            var modifiedUrl = onXhrOpenCalled(this, method, url, urlParams);
            
            if (typeof modifiedUrl === "string") {
                arguments[1] = modifiedUrl;
            }
        }

        nativeXmlHttpOpen.apply(this, arguments);
    }
}