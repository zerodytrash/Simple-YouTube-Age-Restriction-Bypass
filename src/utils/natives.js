export const nativeJSONParse = window.JSON.parse;

export const nativeXMLHttpRequestOpen = XMLHttpRequest.prototype.open;

// Some extensions like AdBlock override the Object.defineProperty function to prevent a redefinition of the 'ytInitialPlayerResponse' variable by YouTube.
// But we need to define a custom descriptor to that variable to intercept its value. This behavior causes a race condition depending on the execution order with this script :(
// This function tries to restore the native Object.defineProperty function...
export const nativeObjectDefineProperty = (() => {
    // Check if the Object.defineProperty function is native (original)
    if (Object.defineProperty?.toString().indexOf("[native code]") > -1) {
        return Object.defineProperty;
    }

    // if the Object.defineProperty function is already overidden, try to restore the native function from another window...
    const tempFrame = createElement("iframe", { style: `display: none;` });
    document.documentElement.append(tempFrame);

    const native = tempFrame?.contentWindow?.Object?.defineProperty;

    tempFrame.remove();

    if (native) {
        console.info("Simple-YouTube-Age-Restriction-Bypass: Overidden Object.defineProperty function successfully restored!");
        return native;
    } else {
        console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to restore the original Object.defineProperty function");
        return Object.defineProperty;
    }
})();
