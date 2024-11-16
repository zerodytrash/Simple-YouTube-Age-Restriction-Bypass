import * as config from '../../config.js';
import { createElement, isConfirmed, isEmbed, waitForElement } from '../../utils.js';

const confirmationButtonId = 'confirmButton';
const confirmationButtonText = 'Click to unlock';

const buttons = {};

const buttonTemplate = `
<div style="margin-top: 15px !important; padding: 3px 10px 3px 10px; margin: 0px auto; background-color: #4d4d4d; width: fit-content; font-size: 1.2em; text-transform: uppercase; border-radius: 3px; cursor: pointer;">
    <div class="button-text"></div>
</div>
`;

export function isConfirmationRequired() {
    return !isConfirmed && isEmbed && config.ENABLE_UNLOCK_CONFIRMATION_EMBED;
}

export async function requestConfirmation() {
    const errorScreenElement = await waitForElement('.ytp-error', 2000);
    const buttonElement = createElement('div', { class: 'button-container', innerHTML: buttonTemplate });
    buttonElement.getElementsByClassName('button-text')[0].innerText = confirmationButtonText;
    buttonElement.addEventListener('click', () => {
        removeButton(confirmationButtonId);
        confirm();
    });

    // Button already attached?
    if (buttons[confirmationButtonId] && buttons[confirmationButtonId].isConnected) {
        return;
    }

    buttons[confirmationButtonId] = buttonElement;
    errorScreenElement.append(buttonElement);
}

function confirm() {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('unlock_confirmed', '1');
    urlParams.set('autoplay', '1');
    location.search = urlParams.toString();
}

function removeButton(id) {
    if (buttons[id] && buttons[id].isConnected) {
        buttons[id].remove();
    }
}
