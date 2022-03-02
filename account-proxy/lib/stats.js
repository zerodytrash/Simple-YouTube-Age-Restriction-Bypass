const fs = require('fs');
const statsFileName = 'stats.json';

let initialized = false;

let stats = {};

let requestsLastMinute = 0;
let requestsThisMinute = 0;

let latencyMs = 0;
let latencyMsSumUp = 0;
let latencyRequestCount = 0;

let playabilityHistory = [];

function init() {
    // Load stats from file
    try {
        stats = JSON.parse(fs.readFileSync(statsFileName));
    } catch (err) { }

    // Save stats to file
    setInterval(() => {
        try {
            fs.writeFile(statsFileName, JSON.stringify(stats), () => { });
        } catch (err) { }
    }, 10 * 60 * 1000)


    setInterval(() => {
        // Reset request count every minute
        requestsLastMinute = requestsThisMinute;
        requestsThisMinute = 0;

        // Calc latency every minute
        latencyMs = latencyRequestCount > 0 ? (latencyMsSumUp / latencyRequestCount) : 0;
        latencyMsSumUp = 0;
        latencyRequestCount = 0;
    }, 60 * 1000)

    initialized = true;
}

function getTodayKey() {
    return (new Date()).toISOString().split('T')[0];
}

function countDayMetric(metric, key) {
    const day = getTodayKey();

    if (!stats.days) stats.days = {};
    if (!stats.days[day]) stats.days[day] = {};
    if (!stats.days[day][metric]) stats.days[day][metric] = {};
    if (!stats.days[day][metric][key]) stats.days[day][metric][key] = 0;

    stats.days[day][metric][key] += 1;
}


function countRequest(reason, clientName, country, origin) {
    if (!initialized) return;

    requestsThisMinute += 1;

    if (typeof reason === 'string' && reason !== 'UNKNOWN') {
        countDayMetric('reasons', reason.toUpperCase());
    }

    if (typeof clientName == 'string') {
        countDayMetric('clients', clientName.toUpperCase());
    }

    if (typeof country === 'string') {
        countDayMetric('countries', country.toUpperCase());
    }

    if (typeof origin === 'string') {
        countDayMetric('origins', origin);
    }
}

function countResponse(endpoint, status, containsGcrFlag) {
    if (!initialized) return;

    const key = `${endpoint.toUpperCase()}:${status}`;
    countDayMetric('responseResults', key);

    if (typeof containsGcrFlag === 'boolean') {
        countDayMetric('responseContainsGcrFlag', containsGcrFlag ? "YES" : "NO");
    }

    if (endpoint === 'player') {
        playabilityHistory.push(status);
        playabilityHistory = playabilityHistory.slice(-50);
    }
}

function countException(endpoint, message) {
    if (!initialized) return;

    const key = `${endpoint.toUpperCase()}:${message}`;
    countDayMetric('exceptions', key);
}

function countLatency(milliSecs) {
    if (!initialized) return;

    latencyMsSumUp += milliSecs;
    latencyRequestCount += 1;
}

function getRequestsPerMinute() {
    return requestsLastMinute;
}

function getHistoricalStats() {
    return stats;
}

function getTodayStats() {
    return {
        latencyMs: Math.round(latencyMs),
        requestsPerMinute: getRequestsPerMinute(),
        ...(stats.days?.[getTodayKey()] || {}),
        playabilityHistory
    };
}

module.exports = {
    init,
    countRequest,
    countResponse,
    countException,
    countLatency,
    getRequestsPerMinute,
    getHistoricalStats,
    getTodayStats
}