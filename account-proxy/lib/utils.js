function fillObjectFromRequest(obj, request) {
    for (propName in obj) {
        if (typeof request.query[propName] === 'undefined') {
            continue;
        }

        if (typeof obj[propName] === 'number') {
            obj[propName] = parseInt(request.query[propName])
        } else {
            obj[propName] = request.query[propName];
        }
    }
}

function validateObjectAttributes(obj) {
    for (propName in obj) {
        if (obj[propName] === null || obj[propName] === '') {
            throw new Error(`Missing value for ${propName}`);
        }

        if (typeof obj[propName] === 'number' && isNaN(obj[propName])) {
            throw new Error(`Invalid number value for ${propName}`);
        }
    }
}

function extractAttributes(obj, attributesArray) {
    let newObj = {};

    for (let i in attributesArray) {
        let attr = attributesArray[i];
        if (obj[attr]) {
            newObj[attr] = obj[attr];
        }
    }

    return newObj;
}

function getYoutubeResponseStatus(youtubeResponse) {
    return youtubeResponse.data?.playabilityStatus?.status || `HTTP${youtubeResponse.status}`;
}

function checkForGcrFlag(youtubeData) {
    if (typeof youtubeData.streamingData !== 'object') {
        return;
    }

    let streamingDataJson = JSON.stringify(youtubeData.streamingData);

    return streamingDataJson.includes('gcr=') || streamingDataJson.includes('gcr%3D');
}

module.exports = {
    fillObjectFromRequest,
    validateObjectAttributes,
    extractAttributes,
    getYoutubeResponseStatus,
    checkForGcrFlag
}