/*
 *  Don't use imports for now, as it currently bundles additional unused code
 */

function createElement(tagName, options) {
    const node = document.createElement(tagName);
    return options ? Object.assign(node, options) : node;
}

function injectScript() {
    const nScript = createElement('script', { src: chrome.runtime.getURL('injected.js') });
    document.documentElement.append(nScript);
    nScript.remove();
}

injectScript();
