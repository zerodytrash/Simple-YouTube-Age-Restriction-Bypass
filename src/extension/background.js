const matches = ['.*://www.youtube.com/.*', '.*://m.youtube.com/.*', '.*://music.youtube.com/.*'];

// https://stackoverflow.com/a/64475504
chrome.declarativeContent.onPageChanged.removeRules(async () => {
    chrome.declarativeContent.onPageChanged.addRules([
        {
            conditions: matches.map(
                (match) =>
                    new chrome.declarativeContent.PageStateMatcher({
                        pageUrl: { urlMatches: match },
                    })
            ),
            actions: [
                new chrome.declarativeContent.SetIcon({
                    imageData: {
                        16: await loadImageData('icon_16.png'),
                        48: await loadImageData('icon_48.png'),
                    },
                }),
                chrome.declarativeContent.ShowAction ? new chrome.declarativeContent.ShowAction() : new chrome.declarativeContent.ShowPageAction(),
            ],
        },
    ]);
});

// SVG icons aren't supported yet
async function loadImageData(url) {
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const { width, height } = img;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
}
