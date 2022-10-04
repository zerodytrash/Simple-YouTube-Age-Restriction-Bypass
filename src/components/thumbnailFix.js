import { findNestedObjectsByAttributeNames } from '../utils';
import * as logger from '../utils/logger';
import Config from '../config';

export function processThumbnails(responseObject) {
    const thumbnails = findNestedObjectsByAttributeNames(responseObject, ['url', 'height']).filter((x) => typeof x.url === 'string' && x.url.indexOf('https://i.ytimg.com/') === 0);
    const blurredThumbnails = thumbnails.filter((thumbnail) => Config.THUMBNAIL_BLURRED_SQPS.some((sqp) => thumbnail.url.includes(sqp)));

    // Simply remove all URL parameters to eliminate the blur effect.
    blurredThumbnails.forEach((x) => (x.url = x.url.split('?')[0]));

    logger.info(blurredThumbnails.length + '/' + thumbnails.length + ' thumbnails detected as blurred.');
}
