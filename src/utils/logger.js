import { getYtcfgValue } from "../components/innertubeClient";

const logPrefix = "Simple-YouTube-Age-Restriction-Bypass:";
const logSuffix = "You can report bugs at: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues";

export function error(err, msg) {
    console.error(logPrefix, msg, err, getYtcfgDebugString(), logSuffix);
}

export function info(msg) {
    console.info(logPrefix, msg);
}

export function getYtcfgDebugString() {
    try {
        return `InnertubeConfig: `
            + `innertubeApiKey: ${getYtcfgValue('INNERTUBE_API_KEY')} `
            + `innertubeClientName: ${getYtcfgValue('INNERTUBE_CLIENT_NAME')} `
            + `innertubeClientVersion: ${getYtcfgValue('INNERTUBE_CLIENT_VERSION')} `
            + `loggedIn: ${getYtcfgValue('LOGGED_IN')} `;
    } catch (err) {
        return `Failed to access config: ${err}`;
    }
}
