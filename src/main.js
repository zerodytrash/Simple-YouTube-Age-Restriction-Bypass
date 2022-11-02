import './config';
import * as inspectors from './components/inspectors';
import * as interceptors from './components/interceptors';
import * as requestPreprocessor from './components/requestPreprocessor';
import * as thumbnailFix from './components/thumbnailFix';
import * as unlocker from './components/unlocker';
import * as logger from './utils/logger';

try {
    interceptors.attachInitialDataInterceptor(processYtData);
    interceptors.attachJsonInterceptor(processYtData);
    interceptors.attachXhrOpenInterceptor(requestPreprocessor.handleXhrOpen);
    interceptors.attachRequestInterceptor(requestPreprocessor.handleFetchRequest);
} catch (err) {
    logger.error(err, 'Error while attaching data interceptors');
}

function processYtData(ytData) {
    try {
        // Player Unlock #1: Initial page data structure and response from `/youtubei/v1/player` XHR request
        if (inspectors.player.isPlayerObject(ytData) && inspectors.player.isAgeRestricted(ytData.playabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        } // Player Unlock #2: Embedded Player inital data structure
        else if (inspectors.player.isEmbeddedPlayerObject(ytData) && inspectors.player.isAgeRestricted(ytData.previewPlayabilityStatus)) {
            unlocker.unlockPlayerResponse(ytData);
        }
    } catch (err) {
        logger.error(err, 'Video unlock failed');
    }

    try {
        // Unlock sidebar watch next feed (sidebar) and video description
        if (inspectors.next.isWatchNextObject(ytData) && inspectors.next.isWatchNextSidebarEmpty(ytData)) {
            unlocker.unlockNextResponse(ytData);
        }

        // Mobile version
        if (inspectors.next.isWatchNextObject(ytData.response) && inspectors.next.isWatchNextSidebarEmpty(ytData.response)) {
            unlocker.unlockNextResponse(ytData.response);
        }
    } catch (err) {
        logger.error(err, 'Sidebar unlock failed');
    }

    try {
        // Unlock blurry video thumbnails in search results
        if (inspectors.search.isSearchResult(ytData)) {
            thumbnailFix.processThumbnails(ytData);
        }
    } catch (err) {
        logger.error(err, 'Thumbnail unlock failed');
    }

    return ytData;
}
