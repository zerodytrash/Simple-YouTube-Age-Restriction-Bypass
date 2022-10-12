import { createElement, waitForElement } from '../../utils';
import buttonTemplate from './templates/button.html';

let buttons = {};

export async function addButton(id, text, backgroundColor, onClick) {
    const errorScreenElement = await waitForElement('.ytp-error', 2000);
    const buttonElement = createElement('div', { class: 'button-container', innerHTML: buttonTemplate });
    buttonElement.getElementsByClassName('button-text')[0].innerText = text;

    if (backgroundColor) {
        buttonElement.querySelector(':scope > div').style['background-color'] = backgroundColor;
    }

    if (typeof onClick === 'function') {
        buttonElement.addEventListener('click', onClick);
    }

    // Button already attached?
    if (buttons[id] && buttons[id].isConnected) {
        return;
    }

    buttons[id] = buttonElement;
    errorScreenElement.append(buttonElement);
}

export function removeButton(id) {
    if (buttons[id] && buttons[id].isConnected) {
        buttons[id].remove();
    }
}
