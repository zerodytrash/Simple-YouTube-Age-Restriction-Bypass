import { isDesktop, Deferred, createElement } from "../../utils";
import * as Config from "../../config";

import tDesktop from './templates/desktop.html';
import tMobile from './templates/mobile.html';

const pageLoad = new Deferred();
const pageLoadEventName = isDesktop ? 'yt-navigate-finish' : 'state-navigateend';

const template = isDesktop ? tDesktop : tMobile;

const nNotificationWrapper = createElement('div', { id: 'notification-wrapper', innerHTML: template });
const nNotification = nNotificationWrapper.querySelector(':scope > *');
const nMobileText = !isDesktop && nNotification.querySelector('.notification-action-response-text');

window.addEventListener(pageLoadEventName, init, { once: true });

function init() {
    document.body.append(nNotificationWrapper);
    pageLoad.resolve();
}

function show(message, duration = 5) {
    if (!Config.ENABLE_UNLOCK_NOTIFICATION) return;

    pageLoad.then(_show);

    function _show() {
        const _duration = duration * 1000;
        if (isDesktop) {
            nNotification.duration = _duration;
            nNotification.show(message);
        } else {
            nMobileText.innerText = message;
            nNotification.setAttribute('dir', 'in');
            setTimeout(() => {
                nNotification.setAttribute('dir', 'out');
            }, _duration + 225);
        }
    }
}

export default { show };
