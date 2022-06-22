function getScriptContents(url) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', url, false);
    xmlhttp.send(null);
    return xmlhttp.responseText;
}

function logInfo(message) {
    chrome.runtime.sendMessage({ event: 'SET_LOG_ENTRY', message, isError: false });
}

function logError(message, stack) {
    chrome.runtime.sendMessage({ event: 'SET_LOG_ENTRY', message, isError: true, stack });
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
        // Extension disabled?
        if (options && options.extensionEnabled === false) {
            return;
        }

        try {
            const nInjector = document.createElement('injector');
            document.documentElement.append(nInjector);

            nInjector.setAttribute('onclick', `window.SYARB_CONFIG = ${JSON.stringify(options || {})}; ${scriptContents}`);

            // Fire event to execute the script
            nInjector.click();
            nInjector.remove();

            logInfo(`Script injected (${location.href})`);

            // Notify background.js
            chrome.runtime.sendMessage({ event: 'INIT' });
        } catch (err) {
            logError(err.message, err.stack);
        }
    });
}

function updateConfig(changes) {
    // Extension switched on/off? => Reload website
    let { newValue, oldValue } = changes.options;

    let extensionEnabledOld = oldValue ? oldValue.extensionEnabled : true;
    let extensionEnabledNew = newValue ? newValue.extensionEnabled : true;

    if (extensionEnabledOld !== extensionEnabledNew && !document.hidden) {
        window.location.reload();
        return;
    }

    // Firefox specific
    if (typeof cloneInto === 'function') {
        newValue = cloneInto(newValue, document.defaultView);
    }

    // Tell the script the new configuration
    window.dispatchEvent(
        new CustomEvent('SYARB_CONFIG_CHANGE', {
            detail: newValue,
        })
    );
}

function init() {
    try {
        // Pipe log events to background.js
        window.addEventListener('SYARB_LOG_INFO', (e) => logInfo(e.detail.message));
        window.addEventListener('SYARB_LOG_ERROR', (e) => logError(e.detail.message, e.detail.stack));

        injectScript();

        // Listen to config changes
        chrome.storage.onChanged.addListener(updateConfig);
    } catch (err) {
        logError(err.message, err.stack);
    }
}

init();
