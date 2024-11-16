const logPrefix = '%cSimple-YouTube-Age-Restriction-Bypass:';
const logPrefixStyle = 'background-color: #1e5c85; color: #fff; font-size: 1.2em;';
const logSuffix = '\uD83D\uDC1E You can report bugs at: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues';

export function error(err, msg) {
    console.error(logPrefix, logPrefixStyle, msg, err, '\n\n', logSuffix);
    if (window.SYARB_CONFIG) {
        window.dispatchEvent(
            new CustomEvent('SYARB_LOG_ERROR', {
                detail: {
                    message: (msg ? msg + '; ' : '') + (err && err.message ? err.message : ''),
                    stack: err && err.stack ? err.stack : null,
                },
            }),
        );
    }
}

export function info(msg) {
    console.info(logPrefix, logPrefixStyle, msg);
    if (window.SYARB_CONFIG) {
        window.dispatchEvent(
            new CustomEvent('SYARB_LOG_INFO', {
                detail: {
                    message: msg,
                },
            }),
        );
    }
}
