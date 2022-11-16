import process from 'node:process';

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

const relevantAttributes = [
    'playabilityStatus',
    'videoDetails',
    'streamingData',
    'contents',
    'engagementPanels'
]

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

        const youtubeResponses = await Promise.all(pRequests);
        let result = handleResponses(youtubeResponses, clientParams, endpoint);

        res.code(200).send(result);
    } catch (err) {
        console.error(endpoint, err.message);
        res.code(500).send({ errorMessage: err.message });
        stats.countResponse(endpoint, 'EXCEPTION');
        stats.countException(endpoint, err.message);
    } finally {
        let latencyMs = new Date().getTime() - tsStart;
        stats.countLatency(latencyMs);
    }
}

function handleResponses(youtubeResponses, clientParams, endpoint) {
    let responseData = {};

    youtubeResponses.forEach((response, index) => {
        const currentEndpoint = ((endpoint === 'next' && index === 0) || (endpoint === 'player' && index === 1)) ? 'next' : 'player';

        if (response === null || typeof response !== 'object') {
            throw new Error(`Invalid YouTube response received for endpoint /${currentEndpoint}`);
        }

        const youtubeStatus = getYoutubeResponseStatus(response);
        const youtubeGcrFlagSet = checkForGcrFlag(response);
        const relevantData = extractAttributes(response, relevantAttributes);

        stats.countResponse(currentEndpoint, youtubeStatus, youtubeGcrFlagSet);

        if (index === 0) {
            responseData = relevantData;

            responseData.proxy = {
                clientParams,
                youtubeGcrFlagSet,
                youtubeStatus
            };
        } else {
            responseData[currentEndpoint + 'Response'] = relevantData;
        }
    });

    return responseData;
}

export default {
    getPlayer,
    getNext
}
