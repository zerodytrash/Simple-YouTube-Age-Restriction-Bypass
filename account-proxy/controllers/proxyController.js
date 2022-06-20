const { extractAttributes, getYoutubeResponseStatus, checkForGcrFlag } = require('../lib/utils');
const { YouTubeCredentials, YouTubeClientParams } = require('../lib/types');
const innertubeApi = require('../lib/innertubeApi');
const stats = require('../lib/stats');

const credentials = new YouTubeCredentials();
const proxy = process.env.PROXY;

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

        let endpointList = [endpoint];

        // Include /next (sidebar) if flag set
        if (clientParams.includeNext) {
            endpointList.push('next');
        }

        // Wait until all requests are done
        let youtubeResponses = await requestChunk(clientParams, endpointList);
        let result = handleResponses(youtubeResponses, clientParams);

        res.status(200).send(result);

    } catch (err) {
        console.error(endpoint, err.message);
        res.status(500).send({ errorMessage: err.message });
        stats.countResponse(endpoint, 'EXCEPTION');
        stats.countException(endpoint, err.message);
    } finally {
        let latencyMs = new Date().getTime() - tsStart;
        stats.countLatency(latencyMs);
    }
}

function requestChunk(clientParams, endpointList) {
    let pendingRequests = [];

    endpointList.forEach(endpoint => {
        pendingRequests.push(innertubeApi.sendApiRequest(endpoint, clientParams, credentials, proxy));
    });

    return Promise.all(pendingRequests);
}

function handleResponses(youtubeResponses, clientParams) {
    let responseData = {};

    youtubeResponses.forEach((response, index) => {
        if (response.data === null || typeof response.data !== 'object') {
            throw new Error(`Invalid YouTube response received for endpoint /${response.config.endpoint}`);
        }

        const youtubeData = response.data;
        const youtubeStatus = getYoutubeResponseStatus(response);
        const youtubeGcrFlagSet = checkForGcrFlag(youtubeData);
        const relevantData = extractAttributes(youtubeData, relevantAttributes);

        stats.countResponse(response.config.endpoint, youtubeStatus, youtubeGcrFlagSet);

        if (index === 0) {
            responseData = relevantData;

            responseData.proxy = {
                clientParams,
                youtubeGcrFlagSet,
                youtubeStatus
            };
        } else {
            responseData[response.config.endpoint + 'Response'] = relevantData;
        }
    });

    return responseData;
}

module.exports = {
    getPlayer,
    getNext
}