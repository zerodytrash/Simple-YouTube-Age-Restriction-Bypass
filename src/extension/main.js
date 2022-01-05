/*
 *  Don't use imports for now, as it currently bundles additional unused code
 */

function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}

function waitForElement(selector, parentNode = document.documentElement, subtree = false) {
    return (
        parentNode.querySelector(selector) ||
        new Promise((resolve) => {
            new MutationObserver((_, observer) => {
                const element = parentNode.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            }).observe(parentNode, { childList: true, subtree });
        })
    );
}

async function injectScript() {
    const nScript = createElement('script', { src: chrome.runtime.getURL('Simple-YouTube-Age-Restriction-Bypass.js') });
    (await waitForElement('head')).append(nScript);
}

injectScript();
