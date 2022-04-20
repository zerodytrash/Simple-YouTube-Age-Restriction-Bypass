let logEntries = [];

function setTabIconActive(tabId) {
    (chrome.browserAction || chrome.action).setIcon({
        tabId: tabId,
        path: {
            16: 'icon_16.png',
            48: 'icon_48.png',
        },
    });
}

chrome.runtime.onMessage.addListener((data, sender, sendResponse) => {
    switch (data.event) {
        case 'INIT':
            setTabIconActive(sender.tab.id);
            break;
        case 'SET_LOG_ENTRY':
            logEntries = logEntries.slice(-100);
            logEntries.push({
                ts: new Date(),
                isError: data.isError,
                message: data.message,
                stack: data.stack,
            });
        case 'GET_LOG_ENTRIES':
            sendResponse(logEntries);
    }
});
