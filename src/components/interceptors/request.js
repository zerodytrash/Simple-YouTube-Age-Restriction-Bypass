import { parseRelativeUrl } from '../../utils';
import * as logger from '../../utils/logger';

export default function attach(onRequestCreate) {
    if (typeof window.Request !== 'function') {
        return;
    }

    window.Request = new Proxy(window.Request, {
        construct(target, args) {
            const [url, options] = args;
            try {
                const parsedUrl = parseRelativeUrl(url);
                const modifiedUrl = onRequestCreate(parsedUrl, options);

                if (modifiedUrl) {
                    args[0] = modifiedUrl.toString();
                }
            } catch (err) {
                logger.error(err, `Failed to intercept Request()`);
            }

            return Reflect.construct(target, args);
        },
    });
}
