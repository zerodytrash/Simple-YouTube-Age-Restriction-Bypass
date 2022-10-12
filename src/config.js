// Script configuration variables
const UNLOCKABLE_PLAYABILITY_STATUSES = ['AGE_VERIFICATION_REQUIRED', 'AGE_CHECK_REQUIRED', 'CONTENT_CHECK_REQUIRED', 'LOGIN_REQUIRED'];
const VALID_PLAYABILITY_STATUSES = ['OK', 'LIVE_STREAM_OFFLINE'];

// These are the proxy servers that are sometimes required to unlock videos with age restrictions.
// You can host your own account proxy instance. See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
// To learn what information is transferred, please read: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass#privacy
const ACCOUNT_PROXY_SERVER_HOST = 'https://youtube-proxy.zerody.one';
const VIDEO_PROXY_SERVER_HOST = 'https://phx.4everproxy.com';

// User needs to confirm the unlock process on embedded player?
let ENABLE_UNLOCK_CONFIRMATION_EMBED = true;

// Show notification?
let ENABLE_UNLOCK_NOTIFICATION = true;

// Disable content warnings?
let SKIP_CONTENT_WARNINGS = true;

// Some Innertube bypass methods require the following authentication headers of the currently logged in user.
const GOOGLE_AUTH_HEADER_NAMES = ['Authorization', 'X-Goog-AuthUser', 'X-Origin'];

// Whether a thumbnail is blurred can be detected by the following "sqp" parameter values in the thumbnail URL.
// Seems to be base64 encoded protobuf objects, see https://stackoverflow.com/a/51203860
const THUMBNAIL_BLURRED_SQPS = [
    '-oaymwEpCOADEI4CSFryq4qpAxsIARUAAAAAGAElAADIQj0AgKJDeAHtAZmZGUI=', // Desktop 480x270
    '-oaymwEiCOADEI4CSFXyq4qpAxQIARUAAIhCGAFwAcABBu0BmZkZQg==', // Desktop 480x270
    '-oaymwEiCOgCEMoBSFXyq4qpAxQIARUAAIhCGAFwAcABBu0BZmbmQQ==', // Desktop 360x202
    '-oaymwEiCNAFEJQDSFXyq4qpAxQIARUAAIhCGAFwAcABBu0BZmZmQg==', // Desktop 720x404
    '-oaymwEdCNAFEJQDSFryq4qpAw8IARUAAIhCGAHtAWZmZkI=', // Desktop 720x404
    '-oaymwEdCNACELwBSFryq4qpAw8IARUAAIhCGAHtAT0K10E=', // Desktop 336x188
    '-oaymwESCMACELQB8quKqQMG7QHMzMxB', // Mobile 320x180
    '-oaymwESCOADEOgC8quKqQMG7QGZmRlC', // Mobile 480x360
];

// small hack to prevent tree shaking on these exports
export default window[Symbol()] = {
    UNLOCKABLE_PLAYABILITY_STATUSES,
    VALID_PLAYABILITY_STATUSES,
    ACCOUNT_PROXY_SERVER_HOST,
    VIDEO_PROXY_SERVER_HOST,
    ENABLE_UNLOCK_CONFIRMATION_EMBED,
    ENABLE_UNLOCK_NOTIFICATION,
    SKIP_CONTENT_WARNINGS,
    GOOGLE_AUTH_HEADER_NAMES,
    THUMBNAIL_BLURRED_SQPS,
};

if (__BUILD_TARGET__ === 'WEB_EXTENSION') {
    // This allows the extension to override the settings that can be set via the extension popup.
    function applyConfig(options) {
        for (const option in options) {
            switch (option) {
                case 'unlockNotification':
                    ENABLE_UNLOCK_NOTIFICATION = options[option];
                    break;
                case 'unlockConfirmation':
                    ENABLE_UNLOCK_CONFIRMATION_EMBED = options[option];
                    break;
                case 'skipContentWarnings':
                    SKIP_CONTENT_WARNINGS = options[option];
                    break;
            }
        }
    }

    // Apply initial extension configuration
    applyConfig(window.SYARB_CONFIG);

    // Listen for config changes
    window.addEventListener('SYARB_CONFIG_CHANGE', (e) => applyConfig(e.detail));
}
