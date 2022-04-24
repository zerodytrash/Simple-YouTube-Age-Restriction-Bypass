const nMultiPageMenu = document.querySelector('#multi-page-menu');
const nLogArea = nMultiPageMenu.querySelector('#logArea');
const nGithubIssueLink = nMultiPageMenu.querySelector('#githubIssueLink');

nMultiPageMenu.addEventListener('pageChange', (e) => {
    switch (e.detail.pageId) {
        case 'debug':
            initDebugLog();
            break;
    }
});

// Select all log text when click
nLogArea.addEventListener('click', () => {
    nLogArea.focus();
    nLogArea.select();
});

nGithubIssueLink.addEventListener('click', () => {
    // Add the last 30 log lines to the issue body
    const template = '# Description\n[Please explain the problem/bug/behavior]\n\n# Log\n```\n' + nLogArea.value.split('\n').slice(-30).join('\n') + '\n```';
    const issueUrl = 'https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/new?body=' + encodeURIComponent(template);

    open(issueUrl, '_blank');
});

initSettings();
initErrorCount();

function initSettings() {
    const nSettings = document.querySelector('[data-id="settings"]');
    const nReset = nSettings.querySelector('#reset');

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

async function initDebugLog() {
    const logEntries = await getLogEntries();

    let logText = '';

    logEntries.forEach((entry) => {
        logText += `${new Date(entry.ts).toTimeString().split(' ')[0]} [${entry.isError ? 'ERROR' : 'INFO'}] ${entry.message}`;
        logText += entry.isError && entry.stack ? '\n' + entry.stack.split('\n').slice(1, 2).join('\n') + '\n' : '';
        logText += '\n';
    });

    // Set Text and scroll to bottom
    nLogArea.value = logText;
    nLogArea.scrollTop = nLogArea.scrollHeight;
}

async function initErrorCount() {
    const errorCount = (await getLogEntries()).filter((x) => x.isError).length;

    if (errorCount > 0) {
        const nLabel = nMultiPageMenu.querySelector('#debugErrorWarning');
        nLabel.innerText = `${errorCount} Issues`;
    }
}
