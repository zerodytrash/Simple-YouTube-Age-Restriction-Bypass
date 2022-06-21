import { proxy, innertube } from '../endpoints';
import { isEmbed, isConfirmed, getYtcfgValue } from '../../utils';

export default function getUnlockStrategies(originalNextResponse, lastPlayerUnlockReason) {
    const videoId = originalNextResponse.currentVideoEndpoint.watchEndpoint.videoId;
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const hl = getYtcfgValue('HL');

    return [
        /**
         * Retrieve the sidebar and video description by just adding `racyCheckOk` and `contentCheckOk` params
         * This strategy can be used to bypass content warnings
         */
        {
            name: 'Content Warning Bypass',
            skip: !lastPlayerUnlockReason || !lastPlayerUnlockReason.includes('CHECK_REQUIRED'),
            optionalAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: clientName,
                        clientVersion: clientVersion,
                        hl,
                    },
                },
                videoId,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the sidebar and video description from an account proxy server.
         * Session cookies of an age-verified Google account are stored on server side.
         * See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
         */
        {
            name: 'Account Proxy',
            payload: {
                videoId,
                clientName,
                clientVersion,
                hl,
                isEmbed: +isEmbed,
                isConfirmed: +isConfirmed,
            },
            endpoint: proxy,
        },
    ];
}
