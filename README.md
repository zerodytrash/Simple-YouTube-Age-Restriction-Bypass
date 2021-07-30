# Simple YouTube Age Restriction Bypass

A very simple userscript to bypass YouTube's age verification by retrieving the video info from YouTube's incompletely restricted ``/youtubei/v1/player`` endpoint. As fallback (for some non-embeddable videos) an open source <a href="https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy">Account Proxy Server</a> is used. This allows you to watch age-restricted videos without login and without age verification. All videos will be unlocked automatically.
 
![age-restriction-bypass](https://user-images.githubusercontent.com/59258980/127405805-46410359-d99b-4e10-8963-2daf26630366.png)

## Installation
1. Install the Tampermonkey extension for your browser:<br>
&bull; [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)<br>
&bull; [Tampermonkey for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)<br>
&bull; [Tampermonkey for Opera](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)<br>
&bull; [Tampermonkey for Brave](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)<br>
&bull; [Tampermonkey for Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)<br>
&bull; [Tampermonkey for Safari](https://apps.apple.com/app/apple-store/id1482490089?mt=8)<br>

3. Add "Simple-YouTube-Age-Restriction-Bypass.user.js" by clicking [this link](https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/Simple-YouTube-Age-Restriction-Bypass.user.js).
4. Done.


## Usage
No further actions are necessary. All age restricted videos are automatically unlocked.

## Mobile Device Compatibility
This script also works with the mobile YouTube website (m.youtube.com). But currently only [Firefox Nightly for Android](https://www.mozilla.org/de/firefox/channel/android/) supports extensions. It's a challenge to get this to work. See [How to use Tampermonkey on Firefox mobile](https://enux.pl/article/en/2021-03-14/how-use-tampermonkey-firefox-mobile) and [Install Tampermonkey Extension on Firefox Nightly for Android (Video)](https://www.youtube.com/watch?v=GXcg8r0c-Lk). Using [NewPipe](https://github.com/TeamNewPipe/NewPipe) for Android is probably easier. But currently (2021-07-30) age-restricted videos do not seem to work in NewPipe. An update will hopefully be released soon.

## Alternative mirrors
Greasyfork: https://greasyfork.org/en/scripts/423851-simple-youtube-age-restriction-bypass <br>
OpenUserJS: https://openuserjs.org/scripts/zerodytrash/Simple_YouTube_Age_Restriction_Bypass
