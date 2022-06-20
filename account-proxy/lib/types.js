const { fillObjectFromRequest, validateObjectAttributes } = require('./utils');

class YouTubeCredentials {
    constructor(apiKey, sapiSid, pSid) {
        this.apiKey = apiKey || process.env.API_KEY;
        this.sapiSid = sapiSid || process.env.SAPISID;
        this.pSid = pSid || process.env.PSID;

        validateObjectAttributes(this);
    }
}

class YouTubeClientParams {
    constructor() {
        // Default values
        this.videoId = null;
        this.reason = 'UNKNOWN';
        this.clientName = 'WEB';
        this.clientVersion = '2.20210721.00.00';
        this.signatureTimestamp = 18834;
        this.hl = 'en';
        this.startTimeSecs = 0;
        this.includeNext = false;
    }

    fromRequest(request) {
        fillObjectFromRequest(this, request);
    }

    validate() {
        validateObjectAttributes(this);
    }
}

module.exports = {
    YouTubeCredentials,
    YouTubeClientParams
}