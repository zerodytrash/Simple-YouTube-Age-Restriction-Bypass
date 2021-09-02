export const Deferred = function () {
    return Object.assign(new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    }), this);
};

export function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}

// Some extensions like AdBlock override the Object.defineProperty function to prevent a redefinition of the 'ytInitialPlayerResponse' variable by YouTube.
// But we need to define a custom descriptor to that variable to intercept its value. This behavior causes a race condition depending on the execution order with this script :(
// This function tries to restore the native Object.defineProperty function...
export function getNativeDefineProperty() {
    // Check if the Object.defineProperty function is native (original)
    if (Object.defineProperty?.toString().indexOf("[native code]") > -1) {
        return Object.defineProperty;
    }

    // if the Object.defineProperty function is already overidden, try to restore the native function from another window...
    const tempFrame = createElement("iframe", { style: `display: none;` });
    document.documentElement.append(tempFrame);

    const nativeDefineProperty = tempFrame?.contentWindow?.Object?.defineProperty;

    tempFrame.remove();

    if (nativeDefineProperty) {
        console.info("Simple-YouTube-Age-Restriction-Bypass: Overidden Object.defineProperty function successfully restored!");
        return nativeDefineProperty;
    } else {
        console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to restore the original Object.defineProperty function");
        return Object.defineProperty;
    }
}