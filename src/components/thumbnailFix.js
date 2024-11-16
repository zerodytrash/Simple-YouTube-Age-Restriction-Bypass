import * as logger from '../logger.js';

/**
 * The SQP parameter length is different for blurred thumbnails.
 * They contain much less information, than normal thumbnails.
 * The thumbnail SQPs tend to have a long and a short version.
 */
const BLURRED_THUMBNAIL_SQP_LENGTHS = [
    32, // Mobile (SHORT)
    48, // Desktop Playlist (SHORT)
    56, // Desktop (SHORT)
    68, // Mobile (LONG)
    72, // Mobile Shorts
    84, // Desktop Playlist (LONG)
    88, // Desktop (LONG)
];

export function processThumbnails(responseObject) {
    const thumbnails = findObjectsByInnerKeys(responseObject, ['url', 'height']);

    let blurredThumbnailCount = 0;

    for (const thumbnail of thumbnails) {
        if (isThumbnailBlurred(thumbnail)) {
            blurredThumbnailCount++;
            thumbnail.url = thumbnail.url.split('?')[0];
        }
    }

    logger.info(blurredThumbnailCount + '/' + thumbnails.length + ' thumbnails detected as blurred.');
}

function isThumbnailBlurred(thumbnail) {
    const hasSQPParam = thumbnail.url.indexOf('?sqp=') !== -1;

    if (!hasSQPParam) {
        return false;
    }

    const SQPLength = new URL(thumbnail.url).searchParams.get('sqp').length;
    const isBlurred = BLURRED_THUMBNAIL_SQP_LENGTHS.includes(SQPLength);

    return isBlurred;
}

function findObjectsByInnerKeys(object, keys) {
    const result = [];
    const stack = [object];

    for (const obj of stack) {
        // Check current object in the stack for keys
        if (keys.every((key) => typeof obj[key] !== 'undefined')) {
            result.push(obj);
        }

        // Put nested objects in the stack
        for (const key in obj) {
            if (obj[key] && typeof object[key] === 'object') {
                stack.push(obj[key]);
            }
        }
    }

    return result;
}
