<h1 align="center">Simple YouTube Age Restriction Bypass</h1>

![youtube-age-restriction-bypass-v3](https://user-images.githubusercontent.com/59258980/133007022-c12253c0-036c-49fe-8fce-42b62da14e8a.png)

<div align="center">

<p>A very simple to use userscript to bypass YouTube's age verification.</p>

[![GitHub release](https://img.shields.io/github/v/release/zerodytrash/Simple-YouTube-Age-Restriction-Bypass?style=for-the-badge)](#simple-youtube-age-restriction-bypass)
[![downloads](https://img.shields.io/badge/downloads-26K%2B-brightgreen?style=for-the-badge)](#simple-youtube-age-restriction-bypass)
[![license](https://img.shields.io/github/license/zerodytrash/Simple-YouTube-Age-Restriction-Bypass?style=for-the-badge)](#simple-youtube-age-restriction-bypass)

### Browser support

<table style="display: inline">
    <tbody>
        <tr>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px"/>
                </br>Chrome
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px"/>
                </br>Edge
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px"/>
                </br>Firefox
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px"/>
                </br>Safari
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px"/>
                </br>Opera
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/brave/brave_48x48.png" alt="Brave" width="24px" height="24px"/>
                </br>Brave
            </td>
        </tr>
    </tbody>
</table>

### Downloads
[![GitHub](https://img.shields.io/badge/-github-222222?style=for-the-badge&logo=github)](https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/dist/Simple-YouTube-Age-Restriction-Bypass.user.js)
[![GreasyFork](https://img.shields.io/badge/-greasyfork-950000?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAAXNSR0IArs4c6QAAAYdJREFUeNpNkU1LVHEUh3+jn8GdtYg+QOHiCiESBokQFaFQYBFYGAlGZMnQVLNIVFB8uQPqoCPeq+JCdBgUHXUUBF9WioLrOzsXLl0M18v/Uf6oeB44HM554Cx+klQmSaoe8SqD4bA7/BH0+ZWO7OWmxb6kRxmkjjlyLLDFBPdcYjeK2rbesm46IpkanvDRvIm+GgcVrCK1pj+RLzWQp516niJLTelqcu3vIZbNB7L85JQZFkizQj8tzBufhCN538hEi/zlHDhgGP+K/7QxFQ3Q4UmBkElyBsAR4jHCYoQCNYbveE4VGY45AfI84wV1vEb0kAw1frHLfXrpp4teq2wjchSoZ4LJUPFiHJn3tJLE5RX7wBrlNCLzm85AZZ5QJGrRNXvAKnaLPDU7CVKmk2myeGywzi+rrPDZJJAjyXU9ZktLZJkhS4414hxCaZOBlGzFqgq1NJlHUYV5STMZ0xTJ5JnfuROWXFHBA2RpoQGlVH59/We9h9Xf/a5iOpwM/xTH/PbbuC8B++4oDDg4lrsAAAAASUVORK5CYII=)](https://greasyfork.org/en/scripts/423851-simple-youtube-age-restriction-bypass)
[![OpenUserJS](https://img.shields.io/badge/-openuserjs-2C3E50?style=for-the-badge)](https://openuserjs.org/scripts/zerodytrash/Simple_YouTube_Age_Restriction_Bypass)

</div>

## How it works

When a YouTube video is detected as age-restricted, this userscript will retrieve the video and all other information from YouTube's unrestricted ``/youtubei/v1/player`` endpoint. As a fallback (for some non-embeddable videos) an open source <a href="https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy">Account Proxy Server</a> is used. This allows you to watch all types of age-restricted videos without age verification and without the need to be signed in.

All videos will be unlocked automatically!

## Installation
1. Install a userscript manager (browser extension) of your choice:<br>
&bull; [Tampermonkey](https://www.tampermonkey.net)<br>
&bull; [Violentmonkey](https://violentmonkey.github.io/get-it)<br>
&bull; [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey) (Firefox only)<br>

2. Install **Simple YouTube Age Restriction Bypass** by clicking [this link](https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/dist/Simple-YouTube-Age-Restriction-Bypass.user.js).

## Usage
No further actions are necessary. All age restricted videos are automatically unlocked.

## Mobile Device Compatibility
This script also works with the mobile YouTube website (m.youtube.com). But currently only [Kiwi Browser for Android](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) and [Firefox Nightly for Android](https://play.google.com/store/apps/details?id=org.mozilla.fenix) supports extensions. In Kiwi Browser you can simply visit the Chrome Web Store to install [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) and install the script.
Using [NewPipe](https://github.com/TeamNewPipe/NewPipe) for Android is probably easier. But currently (2021-09-17) age-restricted videos do not seem to work in NewPipe. An update will hopefully be released soon.

## Development
We use [Rollup](https://rollupjs.org) with [Babel](https://github.com/babel/babel) to transpile into a single userscript file and maintain support for older browsers.

If you want to customize the script follow these steps:
1. Clone the repository
```sh
git clone https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass.git
```
2. Install the required build tools
```sh
npm install
```
3. Build the userscript
```sh
npm run build
```

The final output should now be located in the `dist` folder.
