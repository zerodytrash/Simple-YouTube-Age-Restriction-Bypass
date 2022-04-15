import { createElement } from '../utils/index.js';

function injectScript() {
    const nScript = createElement('script', { src: chrome.runtime.getURL('injected.js') });

    chrome.storage.sync.get('options', ({ options }) => {
        nScript.setAttribute('isExtension', true);
        nScript.setAttribute('initialConfig', JSON.stringify(options || {}));

        document.documentElement.append(nScript);
        nScript.remove();
    });
}

function updateConfig(changes) {
    // Firefox specific
    if (typeof cloneInto === 'function') {
        changes = cloneInto(changes, document.defaultView);
    }

    // Tell the script the new configuration
    window.dispatchEvent(
        new CustomEvent('SYARB_CONFIG_CHANGE', {
            detail: changes.options.newValue,
        })
    );
}

chrome.storage.onChanged.addListener(updateConfig);

injectScript();
