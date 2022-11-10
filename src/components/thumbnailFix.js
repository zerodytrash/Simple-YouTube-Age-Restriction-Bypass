import Config from '../config';
import { findNestedObjectsByAttributeNames } from '../utils';
import * as logger from '../utils/logger';

export function processThumbnails(responseObject) {
    const thumbnails = findNestedObjectsByAttributeNames(responseObject, ['url', 'height']);

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
    const isBlurred = Config.BLURRED_THUMBNAIL_SQP_LENGTHS.includes(SQPLength);

    return isBlurred;
}
