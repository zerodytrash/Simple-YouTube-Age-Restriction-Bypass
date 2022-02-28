require("dotenv").config()

const express = require("express")
const app = express()
const rateLimit = require("express-rate-limit")
const innertube = require("./innertube-api")

// limit requests to 5 per 30s for a single IP
app.use(rateLimit({
    windowMs: 30000,
    max: 5,
    handler: function (req, res) {
        res.status(429).send({ errorMessage: "Too Many Requests" });
    },
}));

app.enable('trust proxy'); // use X-Forwarded-* headers, remove this if you don't use a reverse proxy!

// Some anonymous stats to monitor the server load
let playabilityHistory = [];
let dailyStats = {};
let requestCountLastMinute = 0;
let requestCountThisMinute = 0;

setInterval(() => {
    requestCountLastMinute = requestCountThisMinute;
    requestCountThisMinute = 0;
}, 60 * 1000)

function pushPlayabilityHistory(playabilityStatus) {
    playabilityHistory.push(playabilityStatus);
    playabilityHistory = playabilityHistory.slice(-100);
}

function countRequest(endpoint, status) {
    let date = (new Date()).toISOString().split('T')[0];
    let key = `${endpoint}:${status}`

    if (!dailyStats[date]) dailyStats[date] = {};
    if (!dailyStats[date][key]) dailyStats[date][key] = 0;

    dailyStats[date][key] += 1;
    requestCountThisMinute += 1;
}

app.get("/", (req, res) => {
    res.redirect("https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass");
});

app.get("/playabilityHistory", (req, res) => {
    res.send(playabilityHistory);
});

app.get("/sessionHealth", (req, res) => {
    res.send({ loggedIn: !playabilityHistory.includes("LOGIN_REQUIRED") });
});

app.get("/stats", (req, res) => {
    res.send({ daily: dailyStats, requestsPerMinute: requestCountLastMinute });
});

app.get("/getPlayer", (req, res) => {

    res.header("Access-Control-Allow-Origin", "*");

    if (!req.query.videoId || req.query.videoId.length !== 11) {
        res.status(400).send({ errorMessage: "invalid videoId" });
        return;
    }

    // Hotfix for embed player
    if (req.query.clientName === 'WEB_EMBEDDED_PLAYER') {
        req.query.clientName = 'WEB';
    }

    innertube.getPlayer(req.query.videoId, req.query.clientName, req.query.clientVersion, parseInt(req.query.signatureTimestamp), req.query.hl, process.env.API_KEY, process.env.SAPISID, process.env.PSID, process.env.PROXY).then(videoInfoResponse => {

        // extract relevant data
        var publicData = {
            videoDetails: videoInfoResponse.data.videoDetails,
            playabilityStatus: videoInfoResponse.data.playabilityStatus,
            streamingData: videoInfoResponse.data.streamingData,
        }

        let status = publicData.playabilityStatus ? publicData.playabilityStatus.status : "MISSING_STATUS";

        pushPlayabilityHistory(status);
        countRequest('PLAYER', status)

        res.status(200).send(publicData);

    }).catch(err => {
        console.error(err.toString());
        pushPlayabilityHistory("EXCEPTION");
        countRequest('PLAYER', 'EXCEPTION');
        res.status(500).send({ errorMessage: "proxy backend error: " + err.toString() });
    })
})

app.get("/getNext", (req, res) => {

    res.header("Access-Control-Allow-Origin", "*");

    if (!req.query.videoId || req.query.videoId.length !== 11) {
        res.status(400).send({ errorMessage: "invalid videoId" });
        return;
    }

    innertube.getNext(req.query.videoId, req.query.clientName, req.query.clientVersion, req.query.hl, process.env.API_KEY, process.env.SAPISID, process.env.PSID, process.env.PROXY).then(nextResponse => {

        // extract relevant data
        var publicData = {
            contents: nextResponse.data.contents,
            engagementPanels: nextResponse.data.engagementPanels
        }

        countRequest('NEXT', 'OK');

        res.status(200).send(publicData);

    }).catch(err => {
        console.error(err.toString());
        countRequest('NEXT', 'EXCEPTION');
        res.status(500).send({ errorMessage: "proxy backend error: " + err.toString() });
    })
})


app.listen(process.env.PORT, () => {
    console.log(`Server listening at http://localhost:${process.env.PORT}`)
})
