<div align="center">
    <img height="80" src="../../raw/main/src/extension/icon/icon_128.png"></img>
    <h1>Simple YouTube Age Restriction Bypass</h1>
    <a href="#getting-started">Getting started</a> |
    <a href="#privacy">Privacy</a> |
    <a href="#development">Development</a> |
    <a href="#contributors">Contributors</a>
</div>

<br>

<div align="center">
    <img width="800" src="https://user-images.githubusercontent.com/59258980/133007022-c12253c0-036c-49fe-8fce-42b62da14e8a.png" alt="Simple YouTube Age Restriction Bypass"/>
    <br>
    <p>A very simple to use browser extension to bypass YouTube's age verification 😎</p>
    <br>
    <a href="#getting-started">
        <img src="https://img.shields.io/github/v/release/zerodytrash/Simple-YouTube-Age-Restriction-Bypass?style=for-the-badge&labelColor=14161f&color=3455db&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABNUlEQVR4XmNgGJTAJPS2MxAvAOKLULzANPSOA8yxJiG3GrA63CTktgBQwyEg/g/E24B4EhDPAuLzULEFIM0gNoYB5kG32YES+4H4vknoLS90BaYht1OBch+hBmEaAJTIg0q6wZ0aersAKAZ2uknonVgg+w8+A04BJfch2wwNhwTjkNuWUC8BXXjrAAhjeAGo4D0Qt2AzgKiYBmr+AsRlaAa0AsVOGoXcNkDyVgZQ7Bo2FxwDSmxElzAJuxMOFH8AjKEoSFjcnobuVbAeoGAiNIDg8Y1kqwgwFqRMQ29rAtV8AIZBHIYLjILv8QAl7wHxFaBtChguAYoB5S6B0oRx0AM2HAnpJkjRUWh8zwHSRVAMYoPSwFGTkJsYhqMYZhx6lwOosAKIz0A1gTSC2BUgOaJihK6KACxxvcsBmqZ3AAAAXXRFWHRDb3B5cmlnaHQAQ3JlYXRlZCB3aXRoIEljb25mdS5jb20gLSBEZXJpdmF0aXZlIHdvcmsgb2YgTWF0ZXJpYWwgaWNvbnMgKENvcHlyaWdodCBHb29nbGUgSW5jLinxtJO+AAAAV3RFWHRMaWNlbnNlAExpY2Vuc2VkIHVuZGVyIEFwYWNoZSBMaWNlbnNlIHYyLjAgKGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCnj13QbAAAAAElFTkSuQmCC" alt="GitHub release"/>
    </a>
    <a href="#getting-started">
        <img src="https://img.shields.io/badge/downloads-2.8m%2B-brightgreen?style=for-the-badge&labelColor=141f17&color=2aa745&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAXElEQVR4XmNgGLRAa7nrf2RMskOHqAFAZ2sB8St05yPxQXJaeMMDjyGENcNMxmII8ZqxGEK6ZjRD8PuZ5ASCTwPQ7wvwxAAsZS7AaYbmclcHIE4ggB2o6mqKDQMAqh55MwxuUuQAAABddEVYdENvcHlyaWdodABDcmVhdGVkIHdpdGggSWNvbmZ1LmNvbSAtIERlcml2YXRpdmUgd29yayBvZiBNYXRlcmlhbCBpY29ucyAoQ29weXJpZ2h0IEdvb2dsZSBJbmMuKfG0k74AAABXdEVYdExpY2Vuc2UATGljZW5zZWQgdW5kZXIgQXBhY2hlIExpY2Vuc2UgdjIuMCAoaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wKePXdBsAAAAASUVORK5CYII=" alt="downloads"/>
    </a>
    <a href="/LICENSE" target="_blank">
        <img src="https://img.shields.io/github/license/zerodytrash/Simple-YouTube-Age-Restriction-Bypass?style=for-the-badge&labelColor=1b141f&color=9650b9&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAnElEQVR4XmNgwAOm+++0nR64kw2fGqxy0/x3Wk0L2HkYiP8D8eNpgTsTiTJkmv8uNaCG9VCNIM3I+CaQH4TdxsAdUkDJWTg0oht0anrATmcUg6YG7FxApGa4YegGOEwL2JVACsbwClCzAcgAoGscQJKE+NgMALpg53+Qd6AG4OUPUwPID0RQyJMShSC11E5IOwpA0UcKJipzEaMIAE2iTK12MdYWAAAAXXRFWHRDb3B5cmlnaHQAQ3JlYXRlZCB3aXRoIEljb25mdS5jb20gLSBEZXJpdmF0aXZlIHdvcmsgb2YgTWF0ZXJpYWwgaWNvbnMgKENvcHlyaWdodCBHb29nbGUgSW5jLinxtJO+AAAAV3RFWHRMaWNlbnNlAExpY2Vuc2VkIHVuZGVyIEFwYWNoZSBMaWNlbnNlIHYyLjAgKGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMCnj13QbAAAAAElFTkSuQmCC" alt="license"/>
    </a>
</div>

---

## How it works

This extension uses some API tricks to access age-restricted videos from YouTube anonymously. As a fallback (in case that the API bypass methods does not work) an open source [Account Proxy Server](/account-proxy) is used. This allows you to watch all types of age-restricted videos on **YouTube** and **YouTube Music** without age verification and without the need to be signed in.

All videos will be unlocked automatically!

## Getting started

### Installation

You have two options depending on the browser you use. You can install the script as a **[Userscript](https://en.wikipedia.org/wiki/Userscript)** in all popular browsers or as a **Browser Extension** in some supported browsers listed below.

#### Browser Extension

Unfortunately, our Firefox extension was removed from Mozilla add-ons and disabled on Edge add-ons due to a violation of their terms of service.

As a result, we can no longer provide updates for it. However, the extension can still be installed manually.

We're looking for ways to make this process easier.

#### Userscript

1. Install a [Userscript Manager](https://en.wikipedia.org/wiki/Userscript_manager) of your choice. We recommend [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
    > - [Tampermonkey for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)<br>
    > - [Tampermonkey for Firefox](https://addons.mozilla.org/en/firefox/addon/tampermonkey/)<br>
    > - [Tampermonkey for Opera](https://addons.opera.com/en/extensions/details/tampermonkey-beta/)<br>
    > - [Tampermonkey for Edge](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)<br>
    > - [Userscripts for Safari (MacOS/iOS/iPadOS)](https://apps.apple.com/us/app/userscripts/id1463298887)<br>

2. Install **Simple YouTube Age Restriction Bypass** by clicking **[this link](../../raw/main/dist/Simple-YouTube-Age-Restriction-Bypass.user.js)**.

Alternative mirrors:

<a href="https://greasyfork.org/en/scripts/423851-simple-youtube-age-restriction-bypass">
    <img src="https://img.shields.io/badge/-greasyfork-950000?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAAXNSR0IArs4c6QAAAYdJREFUeNpNkU1LVHEUh3+jn8GdtYg+QOHiCiESBokQFaFQYBFYGAlGZMnQVLNIVFB8uQPqoCPeq+JCdBgUHXUUBF9WioLrOzsXLl0M18v/Uf6oeB44HM554Cx+klQmSaoe8SqD4bA7/BH0+ZWO7OWmxb6kRxmkjjlyLLDFBPdcYjeK2rbesm46IpkanvDRvIm+GgcVrCK1pj+RLzWQp516niJLTelqcu3vIZbNB7L85JQZFkizQj8tzBufhCN538hEi/zlHDhgGP+K/7QxFQ3Q4UmBkElyBsAR4jHCYoQCNYbveE4VGY45AfI84wV1vEb0kAw1frHLfXrpp4teq2wjchSoZ4LJUPFiHJn3tJLE5RX7wBrlNCLzm85AZZ5QJGrRNXvAKnaLPDU7CVKmk2myeGywzi+rrPDZJJAjyXU9ZktLZJkhS4414hxCaZOBlGzFqgq1NJlHUYV5STMZ0xTJ5JnfuROWXFHBA2RpoQGlVH59/We9h9Xf/a5iOpwM/xTH/PbbuC8B++4oDDg4lrsAAAAASUVORK5CYII=" alt="GreasyFork"/>
</a>
<a href="https://openuserjs.org/scripts/zerodytrash/Simple_YouTube_Age_Restriction_Bypass">
    <img src="https://img.shields.io/badge/-openuserjs-2C3E50?style=for-the-badge&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADsQAAA7EB9YPtSQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAcdEVYdFRpdGxlAE9wZW5Vc2VySlMub3JnIGZhdmljb26U3BnCAAAALnRFWHRBdXRob3IATWFydGkgTWFydHogKGh0dHBzOi8vZ2l0aHViLmNvbS9NYXJ0aWkpxKc3NgAAACB0RVh0RGVzY3JpcHRpb24AQmFzZSBTVkcgZm9yIGZhdmljb245LGFfAAAAGHRFWHRDcmVhdGlvbiBUaW1lADIwMTQtMDUtMzFYrHNkAAAAhXRFWHRTb3VyY2UAaHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL09wZW5Vc2VySlMvT3BlblVzZXJKUy5vcmcvNDQxZjZlNWZjNjMzYzhjNmQ4YzhhM2Q0NWE1ODY4NTQ0ZTY4ZGNiNS9wdWJsaWMvaW1hZ2VzL2Zhdmljb24uaWNv8+hvVQAAAPhJREFUOMtjuP307n9KMAPVDbj55M7/CRu2/3epnvBfLrEWjEHsiZt2gOXwGnDm9tX/1qU9/9kCCsFYLLoSjGF8m7IeoJpr2A0AmQ7TDFK4+eQJuKItp07+t6voA8vZlvWiuARuQP+GbWAFIEOuP76N4dQbj+7ADQF5B8MAp6p+sOSG4ydwBhjIJSA1LtUTMQ2QTaj9LxRZTjDUQWGikFSH24BbWEIaGYtG4TAA5oX1x46T5wVYIFoBA/HaI8xABAUsKHZwBiJyNIIMQXYJKGBhcjijEVtCEggv+y8YUYaWkK4STsog74DCBBSwIAxOyhu3E07KA5IbAVwKM3i/YjSuAAAAAElFTkSuQmCC" alt="OpenUserJS"/>
</a>

### Usage

No further actions are necessary. All age restricted videos are automatically unlocked. Make sure you reload YouTube after installation.

## Privacy

In order to unlock some video information, requests are handled through a proxy server. On the server side, the request will be authenticated with the credentials of an age-verified account at YouTube. The source code of the proxy server can be found [here](/account-proxy).

**No credentials are sent from your YouTube account! The only info that the proxy server receives from you is the Video-ID and some non-user related information like the version of the YouTube website.** The used proxy server at `youtube-proxy.zerody.one` **does not** log IP-Adresses or Video-IDs. If you have set a different proxy server instance, then the operator's log policies apply.

To have an overview of the number of requests and possible problems, anonymous usage statistics are collected. These statistics are also not user-related and can be found [here](https://youtube-proxy.zerody.one/getStats).

For some videos it is necessary to route the video data files (hosted at `googlevideo.com`) through a proxy server as well. The third-party service [4everproxy.com](https://www.4everproxy.com/) is used for this. You can read the privacy policy [here](https://www.4everproxy.com/privacy).

## Compatibility

### Browser support

> **Warning**  
> We are currently reevaluating the extension. See [here](#browser-extension).

The following browsers are supported:
<table>
    <tbody>
        <tr>
            <th scope="row"></th>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/chrome/chrome_48x48.png" alt="Chrome" width="24px" height="24px"/>
                <div>Chrome</div>
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/edge/edge_48x48.png" alt="Edge" width="24px" height="24px"/>
                <div>Edge</div>
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/firefox/firefox_48x48.png" alt="Firefox" width="24px" height="24px"/>
                <div>Firefox</div>
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/safari/safari_48x48.png" alt="Safari" width="24px" height="24px"/>
                <div>Safari</div>
            </td>
            <td align="center">
                <img src="https://raw.githubusercontent.com/alrra/browser-logos/master/src/opera/opera_48x48.png" alt="Opera" width="24px" height="24px"/>
                <div>Opera</div>
            </td>
        </tr>
        <tr>
            <th scope="row"><a href="#browser-extension">Extension</a></th>
            <td align="center">🟠</td>
            <td align="center">🟠</td>
            <td align="center">🟠</td>
            <td align="center">🟠</td>
            <td align="center">🟠</td>
        </tr>
        <tr>
            <th scope="row"><a href="#userscript">Userscript</a></th>
            <td colspan="5" align="center">✅ <strong>Full support</strong></td>
        </tr>
    </tbody>
</table>

And many more!

### Android

**Simple YouTube Age Restriction Bypass** works on Android with the browser version of YouTube [m.youtube.com](https://m.youtube.com) in combination with the [Userscript](#userscript).
> Only a few browsers such as [Firefox](https://play.google.com/store/apps/details?id=org.mozilla.firefox) and [Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser) currently support extensions. Tampermonkey can be installed there.

> [Bromite](https://www.bromite.org/) supports userscripts natively. The script can be installed via Settings > User Scripts.

### iOS/iPadOS

**Simple YouTube Age Restriction Bypass** also works on iOS/iPadOS Safari with the browser version of YouTube [m.youtube.com](https://m.youtube.com) in combination with the [Userscript](#userscript).
> **Note**  
> You need to install the free extension [Userscripts](https://apps.apple.com/us/app/userscripts/id1463298887) for Safari from the AppStore to install the [Userscript](#userscript).

## Development

### Prerequisites

- [Git](https://git-scm.com)
- [Node.js](https://nodejs.org) with NPM

### Building

We use [Rollup](https://rollupjs.org) with [Babel](https://github.com/babel/babel) to transpile into a single userscript file and maintain support for older browsers.

**1. Clone the repository**
```sh
git clone https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass.git
```
**2. Install Dependencies**

Run this command at the root folder to install the required dependencies:
```sh
npm install
```
**3. Run Build Script**

Build the userscript and extension:
```sh
npm run build
```

The userscript `Simple-YouTube-Age-Restriction-Bypass.user.js` and extension should now be located in the `dist` folder.
> **Note**  
> The extension is compiled to both Manifest [V2](https://developer.chrome.com/docs/extensions/mv2) and [V3](https://developer.chrome.com/docs/extensions/mv3/intro).

## Contributors

Want to contribute to this project? Feel free to open an [issue](../../issues) or [pull request](../../pulls).

<a href="../../graphs/contributors">
    <img src="https://contrib.rocks/image?repo=zerodytrash/Simple-YouTube-Age-Restriction-Bypass"/>
</a>
