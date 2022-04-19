function getScriptContents(url) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', url, false);
    xmlhttp.send(null);
    return xmlhttp.responseText;
}

function injectScript() {
    // Here we use some tricks to speed up the injection of the script
    // This seems to reduce the later access time if the settings are not in memory
    chrome.storage.sync.get('options', () => {});

    // Load userscript contents synchronously (will block the page)
    const scriptUrl = chrome.runtime.getURL('injected.js');
    const scriptContents = getScriptContents(scriptUrl);

    // Retrieve the extension settings
    chrome.storage.sync.get('options', ({ options }) => {
        const nInjector = document.createElement('injector');
        document.documentElement.append(nInjector);

        nInjector.setAttribute('onclick', `window.SYARB_CONFIG = ${JSON.stringify(options || {})}; ${scriptContents}`);

        // Fire event to execute the script
        nInjector.click();
        nInjector.remove();
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

function init() {
    injectScript();

    // Listen to config changes
    chrome.storage.onChanged.addListener(updateConfig);

    // Notify background.js
    chrome.runtime.sendMessage({ event: 'INIT' });
}

init();
