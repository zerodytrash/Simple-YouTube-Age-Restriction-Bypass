## YouTube Account Proxy

<b>Note: This is not a part of the browser script!</b>
<br>If you only want to watch age-restricted videos, follow <a href="https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass#installation">these instructions</a>.

This is the account proxy server to access the video info via an age-verified or US-located YouTube account. You can run your own account proxy server instance and include the cookies of a YouTube account in the configuration. This allows you to share the account with others to access age-restricted videos.

### Installation
1. Restore dependencies with `npm install`
2. Create the `.env` configuration (see below) and paste the required cookies from your YouTube account.
3. If your account is not age-verified and you don't have an IP from the USA, you must use a http proxy located in that region.
4. Start the server with `node server.js`

``.env`` configuration:

````
PORT=8089

# YouTube Config
API_KEY=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8
SAPISID= #Cookie value "SAPISID"
PSID= #Cookie value "__Secure-3PSID"

# Proxy (optional)
PROXY=https://username:password@host
````
