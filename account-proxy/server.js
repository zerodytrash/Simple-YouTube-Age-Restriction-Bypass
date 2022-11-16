import process from 'node:process';

import dotenv from 'dotenv';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import proxyController from './controllers/proxyController.js';

dotenv.config();

const GITHUB_URL = 'https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass';

// Limit requests to 10 per 30s for a single IP
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_TIME_WINDOW = 30000;

const app = Fastify({
    trustProxy: process.env.ENABLE_TRUST_PROXY === '1',
});

// Enable CORS
app.register(cors, { origin: true });

// Enable rate limit
app.register(rateLimit, {
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_TIME_WINDOW,
});

// Routes
app.get('/', (_, res) => res.redirect(GITHUB_URL));
app.get('/getPlayer', proxyController.getPlayer);
app.get('/getNext', proxyController.getNext);

if (process.env.ENABLE_STATS === '1') {
    const { default: statsController } = await import('./controllers/statsController.js');
    const { default: stats } = await import('./lib/stats.js');
    stats.init();
    app.get('/getStats', statsController.getStats);
}

app.listen({ port: process.env.PORT }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.info(`Server listening at ${address}`);
});
