import * as logger from '../../utils/logger';

export default function attach(onRequestCreate) {
    if (typeof window.Request !== 'function') {
        return;
    }

    window.Request = new Proxy(window.Request, {
        construct(target, args) {
            let [url, options] = args;
            try {
                if (typeof url === 'string') {
                    if (url.indexOf('/') === 0) {
                        url = window.location.origin + url;
                    }

                    if (url.indexOf('https://') !== -1) {
                        const modifiedUrl = onRequestCreate(url, options);

                        if (modifiedUrl) {
                            args[0] = modifiedUrl;
                        }
                    }
                }
            } catch (err) {
                logger.error(err, `Failed to intercept Request()`);
            }

            return Reflect.construct(target, args);
        },
    });
}
