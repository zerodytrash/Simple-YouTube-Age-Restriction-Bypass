import { isDesktop, pageLoadedAndVisible, createElement } from '../../utils';
import * as Config from '../../config';

import tDesktop from './templates/desktop.html';
import tMobile from './templates/mobile.html';

const template = isDesktop ? tDesktop : tMobile;

const nToastContainer = createElement('div', { id: 'toast-container', innerHTML: template });
const nToast = nToastContainer.querySelector(':scope > *');

document.documentElement.append(nToastContainer);

!isDesktop && (
    nToast.nMessage = nToast.querySelector('.notification-action-response-text'),
    nToast.show = (message) => {
        nToast.nMessage.innerText = message;
        nToast.setAttribute('dir', 'in');
        setTimeout(() => {
            nToast.setAttribute('dir', 'out');
        }, nToast.duration + 225);
    }
);

async function show(message, duration = 5) {
    if (!Config.ENABLE_UNLOCK_NOTIFICATION) return;

    await pageLoadedAndVisible;

    nToast.duration = duration * 1000;
    nToast.show(message);
}

export default { show };
