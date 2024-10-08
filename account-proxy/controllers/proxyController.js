import dotenv from 'dotenv';
import { ProxyAgent } from 'undici';

import { extractAttributes, getYoutubeResponseStatus, checkForGcrFlag } from '../lib/utils.js';
import { YouTubeCredentials, YouTubeClientParams } from '../lib/types.js';
import innertubeApi from '../lib/innertubeApi.js';
import stats from '../lib/stats.js';

dotenv.config();

const credentials = new YouTubeCredentials();
const proxy = process.env.PROXY;
const proxyAgent = proxy ? new ProxyAgent(proxy) : undefined;

function getPlayer(req, res) {
    handleProxyRequest(req, res, 'player');
}

function getNext(req, res) {
    handleProxyRequest(req, res, 'next');
}

async function handleProxyRequest(req, res, endpoint) {
    const tsStart = new Date().getTime();

    try {
        const clientParams = new YouTubeClientParams();
        clientParams.fromRequest(req);
        clientParams.validate();

        stats.countRequest(clientParams.reason, clientParams.clientName, req.headers['cf-ipcountry'], req.headers['origin']);

        // Hotfix for embed player
        if (clientParams.clientName === 'WEB_EMBEDDED_PLAYER') {
            clientParams.clientName = 'WEB';
            clientParams.clientVersion = '2.20220228.01.00';
        }

        const pRequests = [innertubeApi.sendApiRequest(endpoint, clientParams, credentials, proxyAgent)];

        // Include /next (sidebar) if flag set
        if (clientParams.includeNext) {
            pRequests.push(innertubeApi.sendApiRequest('next', clientParams, credentials, proxyAgent));
        }

        const [playerResponse, nextResponse] = await Promise.all(pRequests);

        if (!playerResponse || typeof playerResponse !== 'object') {
            throw new Error(`Invalid YouTube response received for endpoint /player`);
        }

        if (clientParams.includeNext && (!nextResponse || typeof nextResponse !== 'object')) {
            throw new Error(`Invalid YouTube response received for endpoint /next`);
        }

        const youtubeStatus = getYoutubeResponseStatus(playerResponse);
        const youtubeGcrFlagSet = checkForGcrFlag(playerResponse);

        stats.countResponse('player', youtubeStatus, youtubeGcrFlagSet);

        const responseData = extractAttributes(playerResponse, ['playabilityStatus', 'videoDetails', 'streamingData']);

        responseData.proxy = { clientParams, youtubeGcrFlagSet, youtubeStatus };

        /**
         * Workaround: when we provide `adaptiveFormats` the client cannot playback the video.
         *
         * It seems the URLs we get here or the one the client constructs from these URLs are tied to the requesting account.
         * The low quality `formats` URLs seem fine.
         */
        delete responseData.streamingData.adaptiveFormats;

        if (nextResponse) {
            stats.countResponse('next', getYoutubeResponseStatus(nextResponse), null);
            responseData.nextResponse = extractAttributes(nextResponse, ['contents', 'engagementPanels']);
        }

        res.code(200).send(responseData);
    } catch (err) {
        if (err instanceof Error) {
            console.error(endpoint, err.message);
            res.code(500).send({ errorMessage: err.message });
            stats.countResponse(endpoint, 'EXCEPTION');
            stats.countException(endpoint, err.message);
        }
    }

    stats.countLatency(new Date().getTime() - tsStart);
}

export default {
    getPlayer,
    getNext
}
