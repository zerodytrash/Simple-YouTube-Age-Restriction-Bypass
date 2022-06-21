import { isEmbed } from '../../utils';
import * as Config from '../../config';

export function isPlayerObject(parsedData) {
    return parsedData?.videoDetails && parsedData?.playabilityStatus;
}

export function isEmbeddedPlayerObject(parsedData) {
    return typeof parsedData?.previewPlayabilityStatus === 'object';
}

export function isAgeRestricted(playabilityStatus) {
    if (!playabilityStatus?.status) return false;
    if (playabilityStatus.desktopLegacyAgeGateReason) return true;
    if (Config.UNLOCKABLE_PLAYABILITY_STATUSES.includes(playabilityStatus.status)) return true;

    // Fix to detect age restrictions on embed player
    // see https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues/85#issuecomment-946853553
    return (
        isEmbed &&
        playabilityStatus.errorScreen?.playerErrorMessageRenderer?.reason?.runs?.find((x) => x.navigationEndpoint)?.navigationEndpoint?.urlEndpoint?.url?.includes('/2802167')
    );
}

export function isUnplayable(playabilityStatus) {
    return playabilityStatus?.status === 'UNPLAYABLE';
}
