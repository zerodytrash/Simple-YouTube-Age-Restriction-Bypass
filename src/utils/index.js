export const Deferred = function () {
    return Object.assign(new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
    }), this);
};

export function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
}
