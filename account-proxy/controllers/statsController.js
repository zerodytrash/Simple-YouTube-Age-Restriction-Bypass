const stats = require('../lib/stats');

function getStats(req, res) {

    res.set('Cache-Control', 'no-store');

    if(req.query.historical) {
        res.send(stats.getHistoricalStats());
    } else {
        res.send(stats.getTodayStats());
    }
}

module.exports = {
    getStats
}