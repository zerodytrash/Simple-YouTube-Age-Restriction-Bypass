## YouTube Account Proxy

<b>Note: This is not a part of the browser script!</b>
<br>If you only want to watch age-restricted videos, follow <a href="https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass#installation">these instructions</a>.

This is the account proxy server to access age-restricted videos via an age-verified or US-located YouTube account. You can run your own account proxy server instance and include the cookies of a YouTube account in the configuration. This allows you to share the account with others to access age-restricted videos.

### Installation
1. Restore dependencies with `npm install`
2. Create the `.env` configuration (see below) and paste the required cookies from your YouTube account.
3. If your account is not age-verified and you don't have an IP from the USA, you might need to usa an http(s) proxy located in that region.
4. Start the server with `node server.js`

``.env`` configuration:

````ini
PORT=8089

# Trust X-Forwarded-* headers? set this to 1 if you use a reverse proxy like Nginx with a corresponding configuration.
ENABLE_TRUST_PROXY=1

# Define if you want to collect anonymous usage statistics to monitor the server load
# The statistics can be retrieved via the `/getStats` endpoint in JSON format
ENABLE_STATS=1

# YouTube Config
# API Key is always the same
API_KEY=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8

# Cookie value "SAPISID" or "__Secure-3PAPISID"
SAPISID=

# Cookie value "__Secure-3PSID"
PSID=

# Proxy (https) (optional)
# PROXY=
````

### Logging

If you run your own proxy instance then you should respect the privacy of the users and reduce all log activities to a minimum.

Concretely this means:
- Do not log IP Addresses
- Do not log Video-IDs

The account proxy itself does not log any user-related data by default. However, it could be that your reverse proxy is logging the requests (if you use one).
For Nginx you can disable the log functionality as follows: https://thisinterestsme.com/disable-nginx-access-log/
