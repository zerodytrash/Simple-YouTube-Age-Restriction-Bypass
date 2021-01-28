# Simple YouTube Age Restriction Bypass
 A very simple userscript to bypass YouTube's age verification by retrieving the video info from YouTube's unrestricted ``/get_video_info`` endpoint. This allows you to watch age-restricted videos without age verification. The videos will be unlocked automatically.

## Installation
1. Install the [Tampermonkey extension for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) or [Tampermonkey extension for Firefox](https://addons.mozilla.org/de/firefox/addon/tampermonkey/)
2. Add "Simple-YouTube-Age-Restriction-Bypass" by clicking [this link](https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js).
3. Done.

## Usage
No further actions are necessary. The videos are automatically unlocked.

## Known issues
- If the "Allow embedding" option is disabled by the uploader, the ``/get_video_info`` endpoint will respond with an error and the playback fails.
