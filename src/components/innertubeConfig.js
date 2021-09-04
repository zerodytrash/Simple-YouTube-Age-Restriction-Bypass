// YouTube API config (Innertube).
// The actual values will be determined later from the global ytcfg variable => setInnertubeConfigFromYtcfg()
const INNERTUBE_CONFIG = {
    INNERTUBE_API_KEY: "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    INNERTUBE_CLIENT_NAME: "WEB",
    INNERTUBE_CLIENT_VERSION: "2.20210721.00.00",
    INNERTUBE_CONTEXT: {},
    STS: 18834, // signatureTimestamp (relevant for the cipher functions)
    LOGGED_IN: false,
};

let configRefreshed = false;

// to avoid version conflicts between client and server response, the current YouTube version config will be determined
function setInnertubeConfigFromYtcfg() {
    if (!window.ytcfg) {
        console.warn("Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration (window.ytcfg). Using old values...");
        return false;
    }

    for (const key in INNERTUBE_CONFIG) {
        const value = window.ytcfg.data_?.[key] ?? window.ytcfg.get?.(key);
        if (value !== undefined && value !== null) {
            INNERTUBE_CONFIG[key] = value;
        } else {
            console.warn(`Simple-YouTube-Age-Restriction-Bypass: Unable to retrieve global YouTube configuration variable '${key}'. Using old value...`);
        }
    }

    return true;
}

export function get() {
    if (!configRefreshed && setInnertubeConfigFromYtcfg()) {
        configRefreshed = true;
    }
    return INNERTUBE_CONFIG;
}

export function isLoggedIn() {
    return get().LOGGED_IN;
}

export function getDebugString() {
    try {
        const cfg = get();
        return `InnertubeConfig: `
            + `innertubeApiKey: ${cfg.INNERTUBE_API_KEY}`
            + `innertubeClientName: ${cfg.INNERTUBE_CLIENT_NAME}`
            + `innertubeClientVersion: ${cfg.INNERTUBE_CLIENT_VERSION}`;        
    } catch(err) {
        return `InnertubeConfig: ???`;
    }
}