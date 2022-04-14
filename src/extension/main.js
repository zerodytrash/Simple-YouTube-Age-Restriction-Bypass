import { createElement } from '../utils/index.js';

function injectScript() {
    const nScript = createElement('script', { src: chrome.runtime.getURL('injected.js') });
    document.documentElement.append(nScript);
    nScript.remove();
}

function initStorage() {
    window.addEventListener(
        'SYARB_INIT',
        () => {
            chrome.storage.sync.get('options', ({ options }) => {
                window.dispatchEvent(
                    new CustomEvent('SYARB_CONFIG_INIT', {
                        detail: options,
                    })
                );
            });
        },
        { once: true }
    );

    chrome.storage.onChanged.addListener((changes) => {
        window.dispatchEvent(
            new CustomEvent('SYARB_CONFIG_CHANGE', {
                detail: changes.options.newValue,
            })
        );
    });
}

initStorage();
injectScript();
