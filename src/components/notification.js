import { Deferred, createElement } from "../utils";
import * as Config from "../config";

export const Notification = (() => {
    const isPolymer = !!window.Polymer;

    const pageLoad = new Deferred();
    const pageLoadEventName = isPolymer ? 'yt-navigate-finish' : 'state-navigateend';

    const node = isPolymer
        ? createElement('tp-yt-paper-toast')
        : createElement('c3-toast', { innerHTML: '<ytm-notification-action-renderer><div class="notification-action-response-text"></div></ytm-notification-action-renderer>' });

    const nMobileText = !isPolymer && node.querySelector('.notification-action-response-text');

    window.addEventListener(pageLoadEventName, init, { once: true });

    function init() {
        document.body.append(node);
        pageLoad.resolve();
    }

    function show(message, duration = 5) {
        if (!Config.ENABLE_UNLOCK_NOTIFICATION) return;

        pageLoad.then(_show);

        function _show() {
            if (isPolymer) {
                node.duration = duration * 1000;
                node.show(message);
            } else {
                nMobileText.innerHTML = message;
                node.setAttribute('dir', 'in');
                setTimeout(() => {
                    node.setAttribute('dir', 'out');
                }, duration * 1000 + 225);
            }
        }
    }

    return { show };
})();