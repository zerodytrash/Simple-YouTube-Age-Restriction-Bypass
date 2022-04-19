function setTabIconActive(tabId) {
    (chrome.browserAction || chrome.action).setIcon({
        tabId: tabId,
        path: {
            16: 'icon_16.png',
            48: 'icon_48.png',
        },
    });
}

chrome.runtime.onMessage.addListener((data, sender) => {
    switch (data.event) {
        case 'INIT':
            setTabIconActive(sender.tab.id, true);
            break;
    }
});
