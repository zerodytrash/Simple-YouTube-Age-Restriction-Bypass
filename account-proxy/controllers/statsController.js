import stats from '../lib/stats.js';

function getStats(req, res) {
    res.header('Cache-Control', 'no-store');

    return req.query.historical
        ? stats.getHistoricalStats()
        : stats.getTodayStats();
}

export default {
    getStats
}
