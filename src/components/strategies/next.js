import { getYtcfgValue, isConfirmed, isEmbed } from '../../utils';
import { innertube, proxy } from '../endpoints';

export default function getUnlockStrategies(videoId, lastPlayerUnlockReason) {
    const client = getYtcfgValue('INNERTUBE_CONTEXT');
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const hl = getYtcfgValue('HL');
    const userInterfaceTheme = client.userInterfaceTheme;

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
                        clientName,
                        clientVersion,
                        hl,
                        userInterfaceTheme,
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
                userInterfaceTheme,
                isEmbed: +isEmbed,
                isConfirmed: +isConfirmed,
            },
            endpoint: proxy,
        },
    ];
}
