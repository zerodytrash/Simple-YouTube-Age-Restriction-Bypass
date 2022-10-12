import Config from '../config';
import { isConfirmed, isEmbed, setUrlParams } from '../utils';
import { addButton, removeButton } from './errorScreen';

const confirmationButtonId = 'confirmButton';
const confirmationButtonText = 'Click to unlock';

export function isConfirmationRequired() {
    return !isConfirmed && isEmbed && Config.ENABLE_UNLOCK_CONFIRMATION_EMBED;
}

export function requestConfirmation() {
    addButton(confirmationButtonId, confirmationButtonText, null, () => {
        removeButton(confirmationButtonId);
        confirm();
    });
}

function confirm() {
    setUrlParams({
        unlock_confirmed: 1,
        autoplay: 1,
    });
}
