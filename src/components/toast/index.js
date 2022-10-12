import Config from '../../config';
import { createElement, isDesktop, isEmbed, isMusic, pageLoaded } from '../../utils';

import tDesktop from './templates/desktop.html';
import tMobile from './templates/mobile.html';

const template = isDesktop ? tDesktop : tMobile;

const nToastContainer = createElement('div', { id: 'toast-container', innerHTML: template });
const nToast = nToastContainer.querySelector(':scope > *');

// On YT Music show the toast above the player controls
if (isMusic) {
    nToast.style['margin-bottom'] = '85px';
}

if (!isDesktop) {
    nToast.nMessage = nToast.querySelector('.notification-action-response-text');
    nToast.show = (message) => {
        nToast.nMessage.innerText = message;
        nToast.setAttribute('dir', 'in');
        setTimeout(() => {
            nToast.setAttribute('dir', 'out');
        }, nToast.duration + 225);
    };
}

async function show(message, duration = 5) {
    if (!Config.ENABLE_UNLOCK_NOTIFICATION) return;
    if (isEmbed) return;

    await pageLoaded();

    // Do not show notification when tab is in background
    if (document.visibilityState === 'hidden') return;

    // Append toast container to DOM, if not already done
    if (!nToastContainer.isConnected) document.documentElement.append(nToastContainer);

    nToast.duration = duration * 1000;
    nToast.show(message);
}

export default { show };
