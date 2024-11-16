import * as logger from '../../logger.js';
import { createDeepCopy, getYtcfgValue, isDesktop } from '../../utils.js';
import innertube from '../innertube.js';
import { lastPlayerUnlockReason, lastPlayerUnlockVideoId } from './player.js';

let cachedNextResponse = {};

export function unlockResponse(ytData) {
    const response = ytData.response ?? ytData;

    const videoId = response.currentVideoEndpoint.watchEndpoint.videoId;

    if (!videoId) {
        throw new Error(`Missing videoId in nextResponse`);
    }

    // Only unlock the /next response when the player has been unlocked as well
    if (videoId !== lastPlayerUnlockVideoId) {
        return;
    }

    const unlockedNextResponse = getUnlockedNextResponse(videoId);

    // check if the sidebar of the unlocked response is still empty
    if (isWatchNextSidebarEmpty(unlockedNextResponse)) {
        throw new Error(`Sidebar Unlock Failed`);
    }

    // Transfer some parts of the unlocked response to the original response
    mergeNextResponse(response, unlockedNextResponse);
}

function getUnlockedNextResponse(videoId) {
    // Check if response is cached
    if (cachedNextResponse.videoId === videoId) return createDeepCopy(cachedNextResponse);

    const unlockStrategies = getUnlockStrategies(videoId, lastPlayerUnlockReason);

    let unlockedNextResponse = {};

    for (const strategy of unlockStrategies) {
        if (strategy.skip) continue;

        logger.info(`Trying Next Unlock Method ${strategy.name}`);

        try {
            unlockedNextResponse = strategy.endpoint.getNext(strategy.payload, strategy.optionalAuth);
        } catch (err) {
            logger.error(`Next unlock Method "${strategy.name}" failed with exception:`, err);
        }

        if (!isWatchNextSidebarEmpty(unlockedNextResponse)) {
            // Cache response to prevent a flood of requests in case youtube processes a blocked response mutiple times.
            cachedNextResponse = { videoId, ...createDeepCopy(unlockedNextResponse) };
            return unlockedNextResponse;
        }
    }
}

function mergeNextResponse(originalNextResponse, unlockedNextResponse) {
    if (isDesktop) {
        // Transfer WatchNextResults to original response
        originalNextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse.contents.twoColumnWatchNextResults.secondaryResults;

        // Transfer video description to original response
        const originalVideoSecondaryInfoRenderer = originalNextResponse.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x) => x.videoSecondaryInfoRenderer,
        ).videoSecondaryInfoRenderer;
        const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents.twoColumnWatchNextResults.results.results.contents.find(
            (x) => x.videoSecondaryInfoRenderer,
        ).videoSecondaryInfoRenderer;

        // TODO: Throw if description not found?
        if (unlockedVideoSecondaryInfoRenderer.description) {
            originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;
        } else if (unlockedVideoSecondaryInfoRenderer.attributedDescription) {
            originalVideoSecondaryInfoRenderer.attributedDescription = unlockedVideoSecondaryInfoRenderer.attributedDescription;
        }

        return;
    }

    // Transfer WatchNextResults to original response
    const unlockedWatchNextFeed = unlockedNextResponse.contents?.singleColumnWatchNextResults?.results?.results?.contents?.find(
        (x) => x.itemSectionRenderer?.targetId === 'watch-next-feed',
    );

    if (unlockedWatchNextFeed) originalNextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);

    // Transfer video description to original response
    const originalStructuredDescriptionContentRenderer = originalNextResponse.engagementPanels
        .find((x) => x.engagementPanelSectionListRenderer)
        .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find((x) => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels
        .find((x) => x.engagementPanelSectionListRenderer)
        .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find((x) => x.expandableVideoDescriptionBodyRenderer);

    if (unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer) {
        originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;
    }
}

function getUnlockStrategies(videoId, lastPlayerUnlockReason) {
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const hl = getYtcfgValue('HL');
    const userInterfaceTheme = getYtcfgValue('INNERTUBE_CONTEXT').client.userInterfaceTheme
        ?? (document.documentElement.hasAttribute('dark') ? 'USER_INTERFACE_THEME_DARK' : 'USER_INTERFACE_THEME_LIGHT');

    return [
        /**
         * Retrieve the sidebar and video description by just adding `racyCheckOk` and `contentCheckOk` params
         * This strategy can be used to bypass content warnings
         */
        {
            name: 'Content Warning Bypass',
            skip: !lastPlayerUnlockReason || !lastPlayerUnlockReason.includes('CHECK_REQUIRED'),
            optionalAuth: true,
            payload: {
                context: {
                    client: {
                        clientName,
                        clientVersion,
                        hl,
                        userInterfaceTheme,
                    },
                },
                videoId,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
    ];
}

export function isWatchNextObject(ytData) {
    const response = ytData.response ?? ytData;
    if (!response?.contents || !response?.currentVideoEndpoint?.watchEndpoint?.videoId) return false;
    return !!response.contents.twoColumnWatchNextResults || !!response.contents.singleColumnWatchNextResults;
}

export function isWatchNextSidebarEmpty(ytData) {
    const response = ytData.response ?? ytData;

    if (isDesktop) {
        // WEB response layout
        const result = response.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results;
        return !result;
    }

    // MWEB response layout
    const content = response.contents?.singleColumnWatchNextResults?.results?.results?.contents;
    const result = content?.find((e) => e.itemSectionRenderer?.targetId === 'watch-next-feed')?.itemSectionRenderer;
    return typeof result !== 'object';
}
