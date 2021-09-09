export class Deferred {
    constructor() {
        return Object.assign(new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        }), this);
    }
}

export function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}

export function isObject(obj) {
    return obj !== null && typeof obj === "object";
}

export const isDesktop = window.location.host !== "m.youtube.com";
