import { innertube, proxy } from '../endpoints';
import { isEmbed, isConfirmed, getCurrentVideoStartTime, getYtcfgValue, getSignatureTimestamp } from '../../utils';

export default function getUnlockStrategies(originalPlayerResponse) {
    const videoId = originalPlayerResponse.videoDetails?.videoId || getYtcfgValue('PLAYER_VARS').video_id;
    const reason = originalPlayerResponse.playabilityStatus?.status || originalPlayerResponse.previewPlayabilityStatus?.status;
    const clientName = getYtcfgValue('INNERTUBE_CLIENT_NAME') || 'WEB';
    const clientVersion = getYtcfgValue('INNERTUBE_CLIENT_VERSION') || '2.20220203.04.00';
    const signatureTimestamp = getSignatureTimestamp();
    const startTimeSecs = getCurrentVideoStartTime(videoId);
    const hl = getYtcfgValue('HL');

    return [
        /**
         * Retrieve the video info by just adding `racyCheckOk` and `contentCheckOk` params
         * This strategy can be used to bypass content warnings
         */
        {
            name: 'Content Warning Bypass',
            skip: !reason || !reason.includes('CHECK_REQUIRED'),
            optionalAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: clientName,
                        clientVersion: clientVersion,
                        hl,
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
                startTimeSecs,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the video info by using the TVHTML5 Embedded client
         * This client has no age restrictions in place (2022-03-28)
         * See https://github.com/zerodytrash/YouTube-Internal-Clients
         */
        {
            name: 'TV Embedded Player',
            requiresAuth: false,
            payload: {
                context: {
                    client: {
                        clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
                        clientVersion: '2.0',
                        clientScreen: 'WATCH',
                        hl,
                    },
                    thirdParty: {
                        embedUrl: 'https://www.youtube.com/',
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
                startTimeSecs,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the video info by using the WEB_CREATOR client in combination with user authentication
         * Requires that the user is logged in. Can bypass the tightened age verification in the EU.
         * See https://github.com/yt-dlp/yt-dlp/pull/600
         */
        {
            name: 'Creator + Auth',
            requiresAuth: true,
            payload: {
                context: {
                    client: {
                        clientName: 'WEB_CREATOR',
                        clientVersion: '1.20210909.07.00',
                        hl,
                    },
                },
                playbackContext: {
                    contentPlaybackContext: {
                        signatureTimestamp,
                    },
                },
                videoId,
                startTimeSecs,
                racyCheckOk: true,
                contentCheckOk: true,
            },
            endpoint: innertube,
        },
        /**
         * Retrieve the video info from an account proxy server.
         * Session cookies of an age-verified Google account are stored on server side.
         * See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
         */
        {
            name: 'Account Proxy',
            payload: {
                videoId,
                reason,
                clientName,
                clientVersion,
                signatureTimestamp,
                startTimeSecs,
                hl,
                isEmbed: +isEmbed,
                isConfirmed: +isConfirmed,
            },
            endpoint: proxy,
        },
    ];
}
