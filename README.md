# Simple YouTube Age Restriction Bypass
 A very simple user-script to bypass YouTube's age verification by retrieving the video file from YouTube's unrestricted ``/get_video_info`` endpoint.

## Installation
1. Install the [Tampermonkey extension for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
2. Add "Simple-YouTube-Age-Restriction-Bypass" by clicking [this link](https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js).
3. Done.

## Usage
- When YouTube prompts you to verify your age, simply press ``ALT + U``.
<img src="https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Screenshots/Screenshot_1.png" width="500"/>

- The video will be played in a popup window.
<img src="https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Screenshots/Screenshot_2.png" width="500"/>

## Known issues
- If the "Allow embedding" option is disabled by the uploader, the ``/get_video_info`` endpoint will respond with an error and the playback fails.
