import { createElement } from '../utils';

export const nativeJSONParse = window.JSON.parse;

export const nativeXMLHttpRequestOpen = XMLHttpRequest.prototype.open;

// Some extensions like AdBlock override the Object.defineProperty function to prevent a redefinition of the 'ytInitialPlayerResponse' variable by YouTube.
// But we need to define a custom descriptor to that variable to intercept its value. This behavior causes a race condition depending on the execution order with this script :(
// To solve this problem the native defineProperty function will be retrieved from another window (iframe)
export const nativeObjectDefineProperty = (() => {
    // Check if function is native
    if (Object.defineProperty.toString().includes("[native code]")) {
        return Object.defineProperty;
    }

    // If function is overidden, restore the native function from another window...
    const tempFrame = createElement("iframe", { style: `display: none;` });
    document.documentElement.append(tempFrame);

    const native = tempFrame.contentWindow.Object.defineProperty;

    tempFrame.remove();

    return native;
})();
