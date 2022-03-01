const fs = require('fs');
const statsFileName = 'stats.json';

let stats = {};
let requestsLastMinute = 0;
let requestsThisMinute = 0;
let playabilityHistory = [];
let initialized = false;

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

    // Reset request count every minute
    setInterval(() => {
        requestsLastMinute = requestsThisMinute;
        requestsThisMinute = 0;
    }, 60 * 1000)

    initialized = true;
}

function getTodayKey() {
    return (new Date()).toISOString().split('T')[0];
}

function countDayMetric(metric, key) {
    let day = getTodayKey();

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

    let key = `${endpoint.toUpperCase()}:${status}`;
    countDayMetric('responseResults', key);

    if (typeof containsGcrFlag === 'boolean') {
        countDayMetric('responseContainsGcrFlag', containsGcrFlag ? "YES" : "NO");
    }

    if (endpoint === 'player') {
        playabilityHistory.push(status);
        playabilityHistory = playabilityHistory.slice(-50);
    }
}

function getRequestsPerMinute() {
    return requestsLastMinute;
}

function getHistoricalStats() {
    return stats;
}

function getTodayStats() {
    return {
        requestsPerMinute: getRequestsPerMinute(),
        ...(stats.days?.[getTodayKey()] || {}),
        playerResultsHistory: playabilityHistory
    };
}

module.exports = {
    init,
    countRequest,
    countResponse,
    getRequestsPerMinute,
    getHistoricalStats,
    getTodayStats
}