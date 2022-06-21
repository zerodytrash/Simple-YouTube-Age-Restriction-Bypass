import * as logger from '../../utils/logger';
import { next as nextInspector } from '../inspectors';
import { getNextUnlockStrategies } from '../strategies';
import { isDesktop, createDeepCopy } from '../../utils';
import { lastPlayerUnlockReason } from './player';

let cachedNextResponse = {};

export default function unlockResponse(originalNextResponse) {
    const unlockedNextResponse = getUnlockedNextResponse(originalNextResponse);

    // check if the sidebar of the unlocked response is still empty
    if (nextInspector.isWatchNextSidebarEmpty(unlockedNextResponse)) {
        throw new Error(`Sidebar Unlock Failed`);
    }

    // Transfer some parts of the unlocked response to the original response
    mergeNextResponse(originalNextResponse, unlockedNextResponse);
}

function getUnlockedNextResponse(nextResponse) {
    const videoId = nextResponse.currentVideoEndpoint.watchEndpoint.videoId;

    if (!videoId) {
        throw new Error(`Missing videoId in nextResponse`);
    }

    // Check if response is cached
    if (cachedNextResponse.videoId === videoId) return createDeepCopy(cachedNextResponse);

    const unlockStrategies = getNextUnlockStrategies(nextResponse, lastPlayerUnlockReason);

    let unlockedNextResponse = {};

    // Try every strategy until one of them works
    unlockStrategies.every((strategy, index) => {
        if (strategy.skip) return true;

        logger.info(`Trying Next Unlock Method #${index + 1} (${strategy.name})`);

        try {
            unlockedNextResponse = strategy.endpoint.getNext(strategy.payload, strategy.optionalAuth);
        } catch (err) {
            logger.error(err, `Next Unlock Method ${index + 1} failed with exception`);
        }

        return nextInspector.isWatchNextSidebarEmpty(unlockedNextResponse);
    });

    // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
    cachedNextResponse = { videoId, ...createDeepCopy(unlockedNextResponse) };

    return unlockedNextResponse;
}

function mergeNextResponse(originalNextResponse, unlockedNextResponse) {
    if (isDesktop) {
        // Transfer WatchNextResults to original response
        originalNextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse.contents.twoColumnWatchNextResults.secondaryResults;

        // Transfer video description to original response
        const originalVideoSecondaryInfoRenderer = originalNextResponse.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x) => x.videoSecondaryInfoRenderer
        ).videoSecondaryInfoRenderer;
        const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x) => x.videoSecondaryInfoRenderer
        ).videoSecondaryInfoRenderer;

        if (unlockedVideoSecondaryInfoRenderer.description) originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

        return;
    }

    // Transfer WatchNextResults to original response
    const unlockedWatchNextFeed = unlockedNextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents?.find(
        (x) => x.itemSectionRenderer?.targetId === 'watch-next-feed'
    );

    if (unlockedWatchNextFeed) originalNextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);

    // Transfer video description to original response
    const originalStructuredDescriptionContentRenderer = originalNextResponse.engagementPanels
        .find((x) => x.engagementPanelSectionListRenderer)
        .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find((x) => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        .find((x) => x.engagementPanelSectionListRenderer)
        .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find((x) => x.expandableVideoDescriptionBodyRenderer);

    if (unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer)
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;
}
