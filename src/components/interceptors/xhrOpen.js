import { nativeXMLHttpRequestOpen } from './natives';
import { parseRelativeUrl } from '../../utils';
import * as logger from '../../utils/logger';

export default function attach(onXhrOpenCalled) {
    XMLHttpRequest.prototype.open = function (method, url) {
        try {
            let parsedUrl = parseRelativeUrl(url);

            if (parsedUrl) {
                const modifiedUrl = onXhrOpenCalled(method, parsedUrl, this);

                if (modifiedUrl) {
                    arguments[1] = modifiedUrl.toString();
                }
            }
        } catch (err) {
            logger.error(err, `Failed to intercept XMLHttpRequest.open()`);
        }

        nativeXMLHttpRequestOpen.apply(this, arguments);
    };
}
