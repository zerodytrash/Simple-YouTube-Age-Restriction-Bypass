const localStoragePrefix = 'SYARB_';

export function set(key, value) {
    localStorage.setItem(localStoragePrefix + key, JSON.stringify(value));
}

export function get(key) {
    try {
        return JSON.parse(localStorage.getItem(localStoragePrefix + key));
    } catch (err) {
        return null;
    }
}
