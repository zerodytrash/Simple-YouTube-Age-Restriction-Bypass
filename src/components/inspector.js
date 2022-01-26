import { isDesktop, isEmbed } from '../utils';
import * as Config from '../config';

export function isPlayerObject(parsedData) {
    return parsedData?.videoDetails && parsedData?.playabilityStatus;
}

export function isEmbeddedPlayerObject(parsedData) {
    return typeof parsedData?.previewPlayabilityStatus === 'object';
}

export function isAgeRestricted(playabilityStatus) {
    if (!playabilityStatus?.status) return false;
    if (playabilityStatus.desktopLegacyAgeGateReason) return true;
    if (Config.UNLOCKABLE_PLAYABILITY_STATUSES.includes(playabilityStatus.status)) return true;

    // Fix to detect age restrictions on embed player
    // see https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/85#issuecomment-946853553
    return (
        isEmbed &&
        playabilityStatus.errorScreen?.playerErrorMessageRenderer?.reason?.runs?.find((x) => x.navigationEndpoint)?.navigationEndpoint?.urlEndpoint?.url?.includes('/2802167')
    );
}

export function isWatchNextObject(parsedData) {
    if (!parsedData?.contents || !parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
}

export function isUnplayable(playabilityStatus) {
    return playabilityStatus?.status === 'UNPLAYABLE';
}

export function isWatchNextSidebarEmpty(parsedData) {
    if (isDesktop) {
        // WEB response layout
        const result = parsedData.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results;
        return !result;
    }

    // MWEB response layout
    const content = parsedData.contents?.singleColumnWatchNextResults?.results?.results?.contents;
    const result = content?.find((e) => e.itemSectionRenderer?.targetId === 'watch-next-feed')?.itemSectionRenderer;
    return typeof result !== 'object';
}

export function isGoogleVideo(method, url) {
    return method === 'GET' && url.host.includes('.googlevideo.com');
}

export function isGoogleVideoUnlockRequired(googleVideoUrl, lastProxiedGoogleVideoId) {
    const urlParams = new URLSearchParams(googleVideoUrl.search);
    const hasGcrFlag = urlParams.get('gcr');
    const wasUnlockedByAccountProxy = urlParams.get('id') === lastProxiedGoogleVideoId;

    return hasGcrFlag && wasUnlockedByAccountProxy;
}

export function isSearchResult(parsedData) {
    return (
        typeof parsedData?.contents?.twoColumnSearchResultsRenderer === 'object' || // Desktop initial results
        parsedData?.contents?.sectionListRenderer?.targetId === 'search-feed' || // Mobile initial results
        parsedData?.onResponseReceivedCommands?.find((x) => x.appendContinuationItemsAction)?.appendContinuationItemsAction?.targetId === 'search-feed' // Desktop & Mobile scroll continuation
    );
}
