import { parseRelativeUrl } from '../../utils';
import { nativeRequest } from './natives';
import * as logger from '../../utils/logger';

export default function attach(onRequestCreate) {
    if (typeof window.Request !== 'function') {
        return;
    }

    window.Request = function (url, options) {
        try {
            let parsedUrl = parseRelativeUrl(url);
            let modifiedUrl = onRequestCreate(parsedUrl, options);

            if (modifiedUrl) {
                arguments[0] = modifiedUrl.toString();
            }
        } catch (err) {
            logger.error(err, `Failed to intercept Request()`);
        }

        return new nativeRequest(...arguments);
    };
}
