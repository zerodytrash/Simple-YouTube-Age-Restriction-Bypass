// User needs to confirm the unlock process on embedded player?
export let ENABLE_UNLOCK_CONFIRMATION_EMBED = true;

// Show notification?
export let ENABLE_UNLOCK_NOTIFICATION = true;

// Disable content warnings?
export let SKIP_CONTENT_WARNINGS = true;

// WORKAROUND: Do not treeshake
export default window[Symbol()] = {
    ENABLE_UNLOCK_CONFIRMATION_EMBED,
    ENABLE_UNLOCK_NOTIFICATION,
    SKIP_CONTENT_WARNINGS,
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
