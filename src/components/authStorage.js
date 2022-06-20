const lcKey = 'SYARBYtApiAuth';

let authData;

try {
    authData = JSON.parse(localStorage.getItem(lcKey));
} catch {}

export function set(authorizationToken, authUser) {
    authData = { authorizationToken, authUser };
    localStorage.setItem(lcKey, JSON.stringify(authData));
}

export function get() {
    return authData || {};
}
