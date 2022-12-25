import process from 'node:process';

import dotenv from 'dotenv';

import { fillObjectFromRequest, validateObjectAttributes } from './utils.js';

dotenv.config();

class YouTubeCredentials {
    constructor() {
        this.API_KEY = process.env.API_KEY;
        this.SID = process.env.SID;
        this.HSID = process.env.HSID;
        this.SSID = process.env.SSID;
        this.APISID = process.env.APISID;
        this.SAPISID = process.env.SAPISID;

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

export {
    YouTubeCredentials,
    YouTubeClientParams
}
