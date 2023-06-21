function fillObjectFromRequest(obj, request) {
    for (const propName in obj) {
        if (!(propName in request.query) || request.query[propName] === 'undefined') {
            continue;
        }

        switch(typeof obj[propName]) {
            case 'number':
                obj[propName] = parseInt(request.query[propName]);
                break;
            case 'boolean':
                obj[propName] = request.query[propName] === '1' || request.query[propName] === 'true';
                break;
            default:
                obj[propName] = request.query[propName];
        }
    }
}

function validateObjectAttributes(obj) {
    for (const propName in obj) {
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

    for (const i in attributesArray) {
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

export {
    fillObjectFromRequest,
    validateObjectAttributes,
    extractAttributes,
    getYoutubeResponseStatus,
    checkForGcrFlag
}
