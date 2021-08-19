require("dotenv").config()

const express = require("express")
const app = express()
const rateLimit = require("express-rate-limit")
const innertube = require("./innertube-api")

app.use(rateLimit({ windowMs: 30000, max: 5 })); // limit requests to 5 per 30s for a single IP
app.enable('trust proxy'); // use X-Forwarded-* headers, remove this if you don't use a reverse proxy!

app.get("/", (req, res) => {
    res.redirect("https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass");
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

        res.status(200).send(publicData);

    }).catch(err => {
        console.error(err);
        res.status(500).send({ errorMessage: "proxy backend error: " + err.toString() });
    })
})

app.listen(process.env.PORT, () => {
    console.log(`Server listening at http://localhost:${process.env.PORT}`)
})
