import * as innertubeConfig from "../components/innertubeConfig";

const logPrefix = "Simple-YouTube-Age-Restriction-Bypass:";
const logSuffix = "You can report bugs at: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues"

export function error(err) {
    console.error(logPrefix, err, innertubeConfig.getDebugString(), logSuffix);
}

export function info(msg) {
    console.info(logPrefix, msg);
}