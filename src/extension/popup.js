const logArea = document.querySelector('#logArea');
const githubIssueLink = document.querySelector('#githubIssueLink');

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

function getLogEntries() {
    return new Promise((resolve) => chrome.runtime.sendMessage({ event: 'GET_LOG_ENTRIES' }, resolve));
}

function setDebugLog(logEntries) {
    let logText = '';

    logEntries.forEach((entry) => {
        logText += `${new Date(entry.ts).toTimeString().split(' ')[0]} [${entry.isError ? 'ERROR' : 'INFO'}] ${entry.message}`;
        logText += entry.isError && entry.stack ? '\n' + entry.stack.split('\n').slice(1, 2).join('\n') + '\n' : '';
        logText += '\n';
    });

    // Set Text and scroll to bottom
    logArea.value = logText;
    logArea.scrollTop = logArea.scrollHeight;
}

function setErrorWarning(logEntries) {
    const errorCount = logEntries.filter((x) => x.isError).length;
    const nLabel = document.querySelector('#debugErrorWarning');

    if (errorCount > 0) {
        nLabel.innerText = `${errorCount} Errors`;
    } else {
        nLabel.innerText = '';
    }
}

window.addEventListener('pageChange', (e) => {
    switch (e.detail.pageId) {
        case 'debug':
            getLogEntries().then(setDebugLog);
            break;
    }
});

// Select all log text when click
logArea.addEventListener('click', () => {
    logArea.focus();
    logArea.select();
});

githubIssueLink.addEventListener('click', () => {
    // Add the last 30 log lines to the issue body
    const template = '# Description\n[Please explain the problem/bug/behavior]\n\n# Log\n```\n' + logArea.value.split('\n').slice(-30).join('\n') + '\n```';
    const issueUrl = 'https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/new?body=' + encodeURIComponent(template);

    open(issueUrl, '_blank');
});

initSettings();
getLogEntries().then(setErrorWarning);
