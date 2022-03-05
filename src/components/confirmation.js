import { isEmbed, setUrlParam } from '../utils';
import { addButton, removeButton } from './errorScreen';
import * as Config from '../config';

const confirmationParamName = 'unlock_confirmed';
const confirmationButtonId = 'confirmButton';
const confirmationButtonText = 'Click to unlock';

export function isConfirmationRequired() {
    if (isConfirmed()) return false;
    return isEmbed && Config.ENABLE_UNLOCK_CONFIRMATION_EMBED;
}

export function requestConfirmation() {
    addButton(confirmationButtonId, confirmationButtonText, null, () => {
        removeButton(confirmationButtonId);
        confirm();
    });
}

function isConfirmed() {
    return window.location.search.includes(confirmationParamName);
}

function confirm() {
    setUrlParam(confirmationParamName, '1');
}
