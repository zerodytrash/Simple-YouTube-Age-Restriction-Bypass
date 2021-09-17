// Script configuration variables
export const UNLOCKABLE_PLAYER_STATES = ["AGE_VERIFICATION_REQUIRED", "AGE_CHECK_REQUIRED", "LOGIN_REQUIRED"];
export const PLAYER_RESPONSE_ALIASES = ["ytInitialPlayerResponse", "playerResponse"];

// Show notification?
export const ENABLE_UNLOCK_NOTIFICATION = true;

// The following proxies are currently used as fallback if the innertube age-gate bypass doesn't work...
// You can host your own account proxy instance. See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
export const ACCOUNT_PROXY_SERVER_HOST = "https://youtube-proxy.zerody.one";
export const VIDEO_PROXY_SERVER_HOST = "https://phx.4everproxy.com";