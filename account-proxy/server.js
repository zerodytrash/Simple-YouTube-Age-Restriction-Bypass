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

let playabilityHistory = [];

function pushPlayabilityHistory(playabilityStatus) {
    playabilityHistory.push(playabilityStatus);
    playabilityHistory = playabilityHistory.slice(-100);
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

app.get("/getPlayer", (req, res) => {

    res.header("Access-Control-Allow-Origin", "*");

    if (!req.query.videoId || req.query.videoId.length !== 11) {
        res.status(400).send({ errorMessage: "invalid videoId" });
        return;
    }

    innertube.getPlayer(req.query.videoId, req.query.clientName, req.query.clientVersion, parseInt(req.query.signatureTimestamp), process.env.API_KEY, process.env.SAPISID, process.env.PSID, process.env.PROXY).then(videoInfoResponse => {

        // extract relevant data
        var publicData = {
            videoDetails: videoInfoResponse.data.videoDetails,
            playabilityStatus: videoInfoResponse.data.playabilityStatus,
            streamingData: videoInfoResponse.data.streamingData,
        }

        pushPlayabilityHistory(publicData.playabilityStatus ? publicData.playabilityStatus.status : "MISSING_STATUS");
        
        res.status(200).send(publicData);

    }).catch(err => {
        console.error(err.toString());
        pushPlayabilityHistory("EXCEPTION");
        res.status(500).send({ errorMessage: "proxy backend error: " + err.toString() });
    })
})

app.listen(process.env.PORT, () => {
    console.log(`Server listening at http://localhost:${process.env.PORT}`)
})
