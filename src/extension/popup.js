function initSettings() {
    const nSettings = document.querySelector('[data-id="settings"]');
    const nReset = document.querySelector('#reset');

    const defaultOptions = {
        unlockNotification: true,
        unlockConfirmation: true,
    };

    const options = { ...defaultOptions };

    nSettings.addEventListener('change', ({ target }) => {
        options[target.name] = target.checked;
        chrome.storage.sync.set({ options });
    });

    nReset.addEventListener('click', () => {
        Object.assign(options, defaultOptions);
        chrome.storage.sync.set({ options });
        resetSettings();
    });

    chrome.storage.sync.get('options', (data) => {
        Object.assign(options, data.options);
        resetSettings();
    });

    function resetSettings() {
        for (const option in options) {
            const nSetting = nSettings.querySelector(`[name=${option}]`);
            if (nSetting) {
                nSetting.checked = options[option];
            }
        }
    }
}

function setDebugLog() {
    chrome.runtime.sendMessage({ event: 'GET_LOG_ENTRIES' }, (logEntries) => {
        let logText = '';
        logEntries.reverse().forEach((entry) => {
            logText += `${new Date(entry.ts).toTimeString().split(' ')[0]} [${entry.isError ? 'ERROR' : 'INFO'}] ${entry.message}`;
            logText += entry.isError && entry.stack ? '\n' + entry.stack : '';
            logText += '\n\n';
        });
        document.querySelector('#logarea').value = logText;
    });
}

window.addEventListener('DOMContentLoaded', initSettings);

window.addEventListener('pageChange', (e) => {
    switch (e.detail.pageId) {
        case 'debug':
            setDebugLog();
            break;
    }
});
