import { nativeJSONParse } from '../../utils/natives';

function sendRequest(payload) {
    const response = new XMLHttpRequest();
    response.open('POST', `${window.location.href}&has_verified=1&pbj=1`, false);
    response.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
    response.send(new URLSearchParams(payload).toString());
    return nativeJSONParse(response.responseText);
}

function getPlayer(payload) {
    return sendRequest(payload).find((x) => x.playerResponse)?.playerResponse;
}

function getNext(payload) {
    return sendRequest(payload).find((x) => x.response)?.response;
}

export default {
    getPlayer,
    getNext,
};
