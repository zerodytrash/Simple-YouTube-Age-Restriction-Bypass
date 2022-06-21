export function isGoogleVideoUrl(url) {
    return url.host.includes('.googlevideo.com');
}

export function isGoogleVideoUnlockRequired(googleVideoUrl, lastProxiedGoogleVideoId) {
    const urlParams = new URLSearchParams(googleVideoUrl.search);
    const hasGcrFlag = urlParams.get('gcr');
    const wasUnlockedByAccountProxy = urlParams.get('id') === lastProxiedGoogleVideoId;

    return hasGcrFlag && wasUnlockedByAccountProxy;
}
