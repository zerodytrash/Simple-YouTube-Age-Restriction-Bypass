import { readFileSync } from 'fs';

async function main() {
    const greasyfork_user_email = process.env.GREASYFORK_USER_EMAIL;
    if (!greasyfork_user_email) {
        throw new Error('Environment variable "GREASYFORK_USER_EMAIL" must be set');
    }

    const greasyfork_user_pass = process.env.GREASYFORK_USER_PASS;
    if (!greasyfork_user_pass) {
        throw new Error('Environment variable "GREASYFORK_USER_PASS" must be set');
    }

    const greasyfork_script_id = process.env.GREASYFORK_SCRIPT_ID;
    if (!greasyfork_script_id) {
        throw new Error('Environment variable "GREASYFORK_SCRIPT_ID" must be set');
    }

    const greasyfork_script_type = (() => {
        switch (process.env.GREASYFORK_SCRIPT_TYPE) {
            case 'public': return '1';
            case 'unlisted': return '2';
            case 'library': return '3';
        }
    })();
    if (!greasyfork_script_type) {
        throw new Error('Environment variable "GREASYFORK_SCRIPT_TYPE" must be set');
    }

    const script_path_to_upload = process.env.SCRIPT_PATH_TO_UPLOAD;
    if (!script_path_to_upload) {
        throw new Error('Environment variable "SCRIPT_PATH_TO_UPLOAD" must be set');
    }

    await publish_to_greasyfork(greasyfork_user_email, greasyfork_user_pass, greasyfork_script_id, greasyfork_script_type, script_path_to_upload);
}

function extract_authenticity_token(text: string): string | null {
    const match = text.match(/name="csrf-token" content="([^"]+)"/);
    return match ? match[1] : null;
}

class Cookies {
    static cookies: string;

    static set(response: Response) {
        this.cookies = response.headers.getSetCookie().join('; ');
    }

    static get() {
        return this.cookies;
    }
}

async function publish_to_greasyfork(user_email: string, user_pass: string, script_id: string, script_type: string, file_path_to_upload: string) {
    const BASE_URL = 'https://greasyfork.org';

    // "/en/search" appears to be the lightest page
    const LIGHTEST_PAGE_URL= `${BASE_URL}/en/search`;

    // Get initial page to retrieve the initial tokens
    const initial_response = await fetch(LIGHTEST_PAGE_URL);

    const initial_response_body = await initial_response.text();

    Cookies.set(initial_response);
    let authenticity_token = extract_authenticity_token(initial_response_body);

    if (!authenticity_token) {
        throw new Error('Could not retrieve initial authenticity token');
    }

    const login_request_url= `${BASE_URL}/en/users/sign_in`;

    const login_request_options: RequestInit = {
        method: 'POST',
        headers: { 'Cookie': Cookies.get() },
        body: new URLSearchParams({
            'authenticity_token': authenticity_token,
            'user[email]': user_email,
            'user[password]': user_pass,
            'user[remember_me]': '0',
            'commit': 'Log in',
        }),
        redirect: 'manual',
    };

    // Log in to retrieve the final login tokens
    const login_response = await fetch(login_request_url, login_request_options);

    Cookies.set(login_response);

    if (login_response.ok) {
        const login_response_body = await login_response.text();
        if (login_response_body.includes('class="alert">Invalid')) {
            console.log('\x1b[1;31mFailed: Sign in\x1b[0m - Incorrect Email or password');
        } else {
            console.log(`\x1b[1;31mFailed: Sign in\x1b[0m - Unknown reason`);
        }
        process.exitCode = 1;
        return;
    } else if (login_response.status >= 300 && login_response.status < 400) {
        const redirect_response = await fetch(LIGHTEST_PAGE_URL, {
            headers: { 'Cookie': Cookies.get() },
        });

        const redirect_response_body = await redirect_response.text();

        Cookies.set(redirect_response);
        authenticity_token = extract_authenticity_token(redirect_response_body);
    } else {
        console.log(`\x1b[1;31mFailed: Sign in\x1b[0m - ${login_response.status} ${login_response.statusText}`);
        process.exitCode = 1;
        return;
    }

    const script_file_blob = new Blob([readFileSync(file_path_to_upload)]);

    const update_body = new FormData();
    update_body.set('authenticity_token', authenticity_token);
    update_body.set('script_version[code]', '');
    update_body.set('code_upload', script_file_blob);
    update_body.set('script_version[additional_info][0][attribute_default]', 'true');
    update_body.set('script_version[additional_info][0][value_markup]', 'html');
    update_body.set('script_version[additional_info][0][attribute_value]', '');
    update_body.set('script_version[attachments][]', '');
    update_body.set('script_version[changelog_markup]', 'html');
    update_body.set('script_version[changelog]', '');
    update_body.set('script[script_type]', script_type);
    update_body.set('script[adult_content_self_report]', '0');
    update_body.set('commit', 'Post new version');

    const upload_request_url= `${BASE_URL}/en/scripts/${script_id}/versions`;

    const upload_request_options: RequestInit = {
        method: 'POST',
        headers: { 'Cookie': Cookies.get() },
        body: update_body,
    };

    const upload_response = await fetch(upload_request_url, upload_request_options);

    const upload_response_body = await upload_response.text();

    // Check if the upload was successful
    if (!upload_response_body.includes('id="install-area"')) {
        console.log(`\x1b[38;2;103;103;103m${upload_response_body}\x1b[0m`);
        if (upload_response_body.includes('validation-errors')) {
            console.log('\x1b[1;31mFailed: Publish to GreasyFork\x1b[0m - Validation errors were reported');
        } else {
            console.log('\x1b[1;31mFailed: Publish to GreasyFork\x1b[0m - Unknown reason');
        }

        process.exitCode = 1;
        return;
    }
}

main();
