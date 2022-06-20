import * as inspector from './inspector';
import * as logger from '../utils/logger';
import { proxy, innertube } from './endpoints';
import { isDesktop, isEmbed, isConfirmed, createDeepCopy, getYtcfgValue } from '../utils';
import { lastPlayerUnlockReason } from './playerUnlocker';

let cachedNextResponse = {};

function getNextUnlockStrategies(nextResponse) {
    const videoId = nextResponse.currentVideoEndpoint.watchEndpoint.videoId;
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const hl = getYtcfgValue('HL');

    return [
        /**
         * Retrieve the sidebar and video description by just adding `racyCheckOk` and `contentCheckOk` params
         * This strategy can be used to bypass content warnings
         */
        {
            name: 'Content Warning Bypass',
            skip: lastPlayerUnlockReason && !lastPlayerUnlockReason.includes('CHECK_REQUIRED'),
            optionalAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: clientName,
                        clientVersion: clientVersion,
                        hl,
                    },
                },
                videoId,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the sidebar and video description from an account proxy server.
         * Session cookies of an age-verified Google account are stored on server side.
         * See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
         */
        {
            name: 'Account Proxy',
            payload: {
                videoId,
                clientName,
                clientVersion,
                hl,
                isEmbed: +isEmbed,
                isConfirmed: +isConfirmed,
            },
            endpoint: proxy,
        },
    ];
}

export function unlockNextResponse(originalNextResponse) {
    const unlockedNextResponse = getUnlockedNextResponse(originalNextResponse);

    // check if the sidebar of the unlocked response is still empty
    if (inspector.isWatchNextSidebarEmpty(unlockedNextResponse)) {
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

    const unlockStrategies = getNextUnlockStrategies(nextResponse);

    let unlockedNextResponse = {};

    // Try every strategy until one of them works
    unlockStrategies.every((strategy, index) => {
        if (strategy.skip) return true;

        logger.info(`Trying Sidebar Unlock Method #${index + 1} (${strategy.name})`);

        try {
            unlockedNextResponse = strategy.endpoint.getNext(strategy.payload, strategy.optionalAuth);
        } catch (err) {
            logger.error(err, `Sidebar Unlock Method ${index + 1} failed with exception`);
        }

        return inspector.isWatchNextSidebarEmpty(unlockedNextResponse);
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
