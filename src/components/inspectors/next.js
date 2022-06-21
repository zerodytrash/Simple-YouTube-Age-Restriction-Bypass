import { isDesktop } from '../../utils';

export function isWatchNextObject(parsedData) {
    if (!parsedData?.contents || !parsedData?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
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
