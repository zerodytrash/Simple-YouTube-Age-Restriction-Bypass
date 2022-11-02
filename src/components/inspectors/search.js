export function isSearchResult(parsedData) {
    return (
        typeof parsedData?.contents?.twoColumnSearchResultsRenderer === 'object' // Desktop initial results
        || parsedData?.contents?.sectionListRenderer?.targetId === 'search-feed' // Mobile initial results
        || parsedData?.onResponseReceivedCommands?.find((x) => x.appendContinuationItemsAction)?.appendContinuationItemsAction?.targetId === 'search-feed' // Desktop & Mobile scroll continuation
    );
}
