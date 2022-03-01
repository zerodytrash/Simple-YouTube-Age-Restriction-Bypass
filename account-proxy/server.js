require('dotenv').config()

const express = require('express');
const rateLimit = require('express-rate-limit');

const stats = require('./lib/stats');

const proxyController = require('./controllers/proxyController');
const statsController = require('./controllers/statsController');

const app = express();

// Limit requests to 10 per 30s for a single IP
const rateLimiter = rateLimit({
    windowMs: 30000,
    max: 10,
    handler: function (req, res) {
        stats.countResponse('ERROR', 'TOO_MANY_REQUEST');
        res.status(429).send({ errorMessage: 'Too Many Requests' });
    },
})

// Enabled CORS
app.use((req, res, next) => {
    res.append('Access-Control-Allow-Origin', '*');
    next();
});

if (process.env.ENABLE_TRUST_PROXY === '1') {
    app.enable('trust proxy');
}

if (process.env.ENABLE_STATS === '1') {
    stats.init();
}


// Routes
app.get('/', (req, res) => res.redirect('https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass'));

app.get('/getPlayer', rateLimiter, proxyController.getPlayer);
app.get('/getNext', rateLimiter, proxyController.getNext);
app.get('/getStats', statsController.getStats);

app.listen(process.env.PORT, () => {
    console.log(`Server listening at http://localhost:${process.env.PORT}`)
})