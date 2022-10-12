export default function attach(obj, prop, onCall) {
    if (!obj || typeof obj[prop] !== 'function') {
        return;
    }

    let original = obj[prop];

    obj[prop] = function() {
        try {
            onCall(arguments);
        } catch {}
        original.apply(this, arguments);
    };
}
