import { createElement } from '../utils/index.js';

function injectScript() {
    const nScript = createElement('script', { src: chrome.runtime.getURL('injected.js') });
    document.documentElement.append(nScript);
    nScript.remove();
}

injectScript();
