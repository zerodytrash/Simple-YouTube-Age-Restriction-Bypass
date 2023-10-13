import * as logger from '../../utils/logger';
import { nativeXMLHttpRequestOpen } from './natives';

export default function attach(onXhrOpenCalled) {
    XMLHttpRequest.prototype.open = function(...args) {
        let [method, url] = args;
        try {
            if (typeof url === 'string') {
                if (url.indexOf('/') === 0) {
                    url = window.location.origin + url;
                }

                if (url.indexOf('https://') !== -1) {
                    const modifiedUrl = onXhrOpenCalled(method, url, this);

                    if (modifiedUrl) {
                        args[1] = modifiedUrl;
                    }
                }
            }
        } catch (err) {
            logger.error(err, `Failed to intercept XMLHttpRequest.open()`);
        }

        nativeXMLHttpRequestOpen.apply(this, args);
    };
}
