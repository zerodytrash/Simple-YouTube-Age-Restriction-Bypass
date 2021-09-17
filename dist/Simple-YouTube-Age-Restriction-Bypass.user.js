
// ==UserScript==
// @name            Simple YouTube Age Restriction Bypass
// @description     Watch age restricted videos on YouTube without login and without age verification :)
// @description:de  Schaue YouTube Videos mit Altersbeschränkungen ohne Anmeldung und ohne dein Alter zu bestätigen :)
// @description:fr  Regardez des vidéos YouTube avec des restrictions d'âge sans vous inscrire et sans confirmer votre âge :)
// @description:it  Guarda i video con restrizioni di età su YouTube senza login e senza verifica dell'età :)
// @version         2.2.1
// @author          Zerody (https://github.com/zerodytrash)
// @namespace       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/
// @supportURL      https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues
// @license         MIT
// @match           https://www.youtube.com/*
// @match           https://m.youtube.com/*
// @grant           none
// @run-at          document-start
// @compatible      chrome Chrome + Tampermonkey or Violentmonkey
// @compatible      firefox Firefox + Greasemonkey or Tampermonkey or Violentmonkey
// @compatible      opera Opera + Tampermonkey or Violentmonkey
// @compatible      edge Edge + Tampermonkey or Violentmonkey
// @compatible      safari Safari + Tampermonkey or Violentmonkey
// ==/UserScript==

/*
    This is a transpiled version to achieve a clean code base and better browser compatibility.
    You can find the nicely readable source code at https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass
*/

(function iife(inject) {
  // Trick to get around the sandbox restrictions in Greasemonkey (Firefox)
  // Inject code into the main window if criteria match
  if (typeof GM_info === "object" && GM_info.scriptHandler === "Greasemonkey" && inject) {
    window.eval("(" + iife.toString() + ")();");
    return;
  }


  // Script configuration variables
  const UNLOCKABLE_PLAYER_STATES = ["AGE_VERIFICATION_REQUIRED", "AGE_CHECK_REQUIRED", "LOGIN_REQUIRED"];
  const PLAYER_RESPONSE_ALIASES = ["ytInitialPlayerResponse", "playerResponse"];

  // The following proxies are currently used as fallback if the innertube age-gate bypass doesn't work...
  // You can host your own account proxy instance. See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
  const ACCOUNT_PROXY_SERVER_HOST = "https://youtube-proxy.zerody.one";
  const VIDEO_PROXY_SERVER_HOST = "https://phx.4everproxy.com";

  const isDesktop = window.location.host !== "m.youtube.com";

  class Deferred {
    constructor() {
      return Object.assign(new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      }), this);
    }}


  function createElement(tagName, options) {
    const node = document.createElement(tagName);
    options && Object.assign(node, options);
    return node;
  }

  function isObject(obj) {
    return obj !== null && typeof obj === "object";
  }

  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }

  // Source: https://coursesweb.net/javascript/sha1-encrypt-data_cs
  function generateSha1Hash(msg) {
    function rotate_left(n, s) {
      var t4 = n << s | n >>> 32 - s;
      return t4;
    }
    function cvt_hex(val) {
      var str = '';
      var i;
      var v;
      for (i = 7; i >= 0; i--) {
        v = val >>> i * 4 & 0x0f;
        str += v.toString(16);
      }
      return str;
    }
    function Utf8Encode(string) {
      string = string.replace(/\r\n/g, '\n');
      var utftext = '';
      for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);
        if (c < 128) {
          utftext += String.fromCharCode(c);
        } else
        if (c > 127 && c < 2048) {
          utftext += String.fromCharCode(c >> 6 | 192);
          utftext += String.fromCharCode(c & 63 | 128);
        } else
        {
          utftext += String.fromCharCode(c >> 12 | 224);
          utftext += String.fromCharCode(c >> 6 & 63 | 128);
          utftext += String.fromCharCode(c & 63 | 128);
        }
      }
      return utftext;
    }
    var blockstart;
    var i, j;
    var W = new Array(80);
    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;
    var A, B, C, D, E;
    var temp;
    msg = Utf8Encode(msg);
    var msg_len = msg.length;
    var word_array = new Array();
    for (i = 0; i < msg_len - 3; i += 4) {
      j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 |
      msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3);
      word_array.push(j);
    }
    switch (msg_len % 4) {
      case 0:
        i = 0x080000000;
        break;
      case 1:
        i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000;
        break;
      case 2:
        i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000;
        break;
      case 3:
        i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80;
        break;}

    word_array.push(i);
    while (word_array.length % 16 != 14) word_array.push(0);
    word_array.push(msg_len >>> 29);
    word_array.push(msg_len << 3 & 0x0ffffffff);
    for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
      for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i];
      for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
      A = H0;
      B = H1;
      C = H2;
      D = H3;
      E = H4;
      for (i = 0; i <= 19; i++) {
        temp = rotate_left(A, 5) + (B & C | ~B & D) + E + W[i] + 0x5A827999 & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }
      for (i = 20; i <= 39; i++) {
        temp = rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1 & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }
      for (i = 40; i <= 59; i++) {
        temp = rotate_left(A, 5) + (B & C | B & D | C & D) + E + W[i] + 0x8F1BBCDC & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }
      for (i = 60; i <= 79; i++) {
        temp = rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6 & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }
      H0 = H0 + A & 0x0ffffffff;
      H1 = H1 + B & 0x0ffffffff;
      H2 = H2 + C & 0x0ffffffff;
      H3 = H3 + D & 0x0ffffffff;
      H4 = H4 + E & 0x0ffffffff;
    }

    return (cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4)).toLowerCase();
  }

  const nativeJSONParse = window.JSON.parse;

  const nativeXMLHttpRequestOpen = XMLHttpRequest.prototype.open;

  // Some extensions like AdBlock override the Object.defineProperty function to prevent a redefinition of the 'ytInitialPlayerResponse' variable by YouTube.
  // But we need to define a custom descriptor to that variable to intercept its value. This behavior causes a race condition depending on the execution order with this script :(
  // To solve this problem the native defineProperty function will be retrieved from another window (iframe)
  const nativeObjectDefineProperty = (() => {
    // Check if function is native
    if (Object.defineProperty.toString().includes("[native code]")) {
      return Object.defineProperty;
    }

    // If function is overidden, restore the native function from another window...
    const tempFrame = createElement("iframe", { style: `display: none;` });
    document.documentElement.append(tempFrame);

    const native = tempFrame.contentWindow.Object.defineProperty;

    tempFrame.remove();

    return native;
  })();

  let wrappedPlayerResponse;
  let wrappedNextResponse;

  function attachInitialDataInterceptor(onInititalDataSet) {

    // Just for compatibility: Backup original getter/setter for 'ytInitialPlayerResponse', defined by other extensions like AdBlock
    let { get: chainedPlayerGetter, set: chainedPlayerSetter } = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse") || {};

    // Just for compatibility: Intercept (re-)definitions on YouTube's initial player response property to chain setter/getter from other extensions by hijacking the Object.defineProperty function
    Object.defineProperty = (obj, prop, descriptor) => {
      if (obj === window && PLAYER_RESPONSE_ALIASES.includes(prop)) {
        console.info("Another extension tries to redefine '" + prop + "' (probably an AdBlock extension). Chain it...");

        if (descriptor !== null && descriptor !== void 0 && descriptor.set) chainedPlayerSetter = descriptor.set;
        if (descriptor !== null && descriptor !== void 0 && descriptor.get) chainedPlayerGetter = descriptor.get;
      } else {
        nativeObjectDefineProperty(obj, prop, descriptor);
      }
    };

    // Redefine 'ytInitialPlayerResponse' to inspect and modify the initial player response as soon as the variable is set on page load
    nativeObjectDefineProperty(window, "ytInitialPlayerResponse", {
      set: (playerResponse) => {
        // prevent recursive setter calls by ignoring unchanged data (this fixes a problem caused by Brave browser shield)
        if (playerResponse === wrappedPlayerResponse) return;

        wrappedPlayerResponse = isObject(playerResponse) ? onInititalDataSet(playerResponse) : playerResponse;
        if (typeof chainedPlayerSetter === "function") chainedPlayerSetter(wrappedPlayerResponse);
      },
      get: () => {
        // eslint-disable-next-line no-empty
        if (typeof chainedPlayerGetter === "function") try {return chainedPlayerGetter();} catch (err) {}
        return wrappedPlayerResponse || {};
      },
      configurable: true });


    // Also redefine 'ytInitialData' for the initial next/sidebar response
    nativeObjectDefineProperty(window, "ytInitialData", {
      set: (nextResponse) => {wrappedNextResponse = isObject(nextResponse) ? onInititalDataSet(nextResponse) : nextResponse;},
      get: () => wrappedNextResponse,
      configurable: true });

  }

  // Intercept, inspect and modify JSON-based communication to unlock player responses by hijacking the JSON.parse function
  function attachJsonInterceptor(onJsonDataReceived) {
    window.JSON.parse = (text, reviver) => {
      const data = nativeJSONParse(text, reviver);
      return !isObject(data) ? data : onJsonDataReceived(data);
    };
  }

  function attachXhrOpenInterceptor(onXhrOpenCalled) {
    XMLHttpRequest.prototype.open = function (method, url) {
      if (arguments.length > 1 && typeof url === "string" && url.indexOf("https://") === 0) {
        const modifiedUrl = onXhrOpenCalled(this, method, new URL(url));

        if (typeof modifiedUrl === "string") {
          url = modifiedUrl;
        }
      }

      nativeXMLHttpRequestOpen.apply(this, arguments);
    };
  }

  function isPlayerObject(parsedData) {
    return (parsedData === null || parsedData === void 0 ? void 0 : parsedData.videoDetails) && (parsedData === null || parsedData === void 0 ? void 0 : parsedData.playabilityStatus);
  }

  function isEmbeddedPlayerObject(parsedData) {
    return typeof (parsedData === null || parsedData === void 0 ? void 0 : parsedData.previewPlayabilityStatus) === "object";
  }

  function isAgeRestricted(playabilityStatus) {
    if (!(playabilityStatus !== null && playabilityStatus !== void 0 && playabilityStatus.status)) return false;
    return !!playabilityStatus.desktopLegacyAgeGateReason || UNLOCKABLE_PLAYER_STATES.includes(playabilityStatus.status);
  }

  function isWatchNextObject(parsedData) {var _parsedData$currentVi, _parsedData$currentVi2;
    if (!(parsedData !== null && parsedData !== void 0 && parsedData.contents) || !(parsedData !== null && parsedData !== void 0 && (_parsedData$currentVi = parsedData.currentVideoEndpoint) !== null && _parsedData$currentVi !== void 0 && (_parsedData$currentVi2 = _parsedData$currentVi.watchEndpoint) !== null && _parsedData$currentVi2 !== void 0 && _parsedData$currentVi2.videoId)) return false;
    return !!parsedData.contents.twoColumnWatchNextResults || !!parsedData.contents.singleColumnWatchNextResults;
  }

  function isUnplayable(playabilityStatus) {
    return (playabilityStatus === null || playabilityStatus === void 0 ? void 0 : playabilityStatus.status) === "UNPLAYABLE";
  }

  function isWatchNextSidebarEmpty(parsedData) {var _parsedData$contents2, _parsedData$contents3, _parsedData$contents4, _parsedData$contents5, _content$find;
    if (isDesktop) {var _parsedData$contents, _parsedData$contents$, _parsedData$contents$2, _parsedData$contents$3;
      // WEB response layout
      const result = (_parsedData$contents = parsedData.contents) === null || _parsedData$contents === void 0 ? void 0 : (_parsedData$contents$ = _parsedData$contents.twoColumnWatchNextResults) === null || _parsedData$contents$ === void 0 ? void 0 : (_parsedData$contents$2 = _parsedData$contents$.secondaryResults) === null || _parsedData$contents$2 === void 0 ? void 0 : (_parsedData$contents$3 = _parsedData$contents$2.secondaryResults) === null || _parsedData$contents$3 === void 0 ? void 0 : _parsedData$contents$3.results;
      return !result;
    }

    // MWEB response layout
    const content = (_parsedData$contents2 = parsedData.contents) === null || _parsedData$contents2 === void 0 ? void 0 : (_parsedData$contents3 = _parsedData$contents2.singleColumnWatchNextResults) === null || _parsedData$contents3 === void 0 ? void 0 : (_parsedData$contents4 = _parsedData$contents3.results) === null || _parsedData$contents4 === void 0 ? void 0 : (_parsedData$contents5 = _parsedData$contents4.results) === null || _parsedData$contents5 === void 0 ? void 0 : _parsedData$contents5.contents;
    const result = content === null || content === void 0 ? void 0 : (_content$find = content.find((e) => {var _e$itemSectionRendere;return ((_e$itemSectionRendere = e.itemSectionRenderer) === null || _e$itemSectionRendere === void 0 ? void 0 : _e$itemSectionRendere.targetId) === "watch-next-feed";})) === null || _content$find === void 0 ? void 0 : _content$find.itemSectionRenderer;
    return typeof result !== "object";
  }

  function isGoogleVideo(method, url) {
    return method === "GET" && url.host.includes(".googlevideo.com");
  }

  function isGoogleVideoUnlockRequired(googleVideoUrl, lastProxiedGoogleVideoId) {
    const urlParams = new URLSearchParams(googleVideoUrl.search);
    const hasGcrFlag = urlParams.get("gcr");
    const wasUnlockedByAccountProxy = urlParams.get("id") === lastProxiedGoogleVideoId;

    return hasGcrFlag && wasUnlockedByAccountProxy;
  }

  function getYtcfgValue(value) {var _window$ytcfg;
    return (_window$ytcfg = window.ytcfg) === null || _window$ytcfg === void 0 ? void 0 : _window$ytcfg.get(value);
  }

  function isUserLoggedIn() {
    // Session Cookie exists?
    if (!getSidCookie()) return false;

    // LOGGED_IN doesn't exist on embedded page, use DELEGATED_SESSION_ID as fallback
    if (typeof getYtcfgValue('LOGGED_IN') === "boolean") return getYtcfgValue('LOGGED_IN');
    if (typeof getYtcfgValue('DELEGATED_SESSION_ID') === "string") return true;

    return false;
  }

  function getPlayer$1(videoId, clientConfig, useAuth) {
    const payload = getInnertubeEmbedPayload(videoId, clientConfig);
    return sendInnertubeRequest('v1/player', payload, useAuth);
  }

  function getNext(videoId, clientConfig, playlistId, playlistIndex) {
    const payload = getInnertubeEmbedPayload(videoId, clientConfig, playlistId, playlistIndex);
    return sendInnertubeRequest('v1/next', payload, false);
  }

  function getMainPageClientName() {
    // replace embedded client with YouTube's main page client (e.g. WEB_EMBEDDED_PLAYER => WEB)
    return getYtcfgValue('INNERTUBE_CLIENT_NAME').replace('_EMBEDDED_PLAYER', '');
  }

  function getSignatureTimestamp() {
    return getYtcfgValue('STS') || (() => {var _document$querySelect;
      // STS is missing on embedded player. Retrieve from player base script as fallback...
      const playerBaseJsPath = (_document$querySelect = document.querySelector('script[src*="/base.js"]')) === null || _document$querySelect === void 0 ? void 0 : _document$querySelect.src;

      if (!playerBaseJsPath) return;

      const xmlhttp = new XMLHttpRequest();
      xmlhttp.open("GET", playerBaseJsPath, false);
      xmlhttp.send(null);

      return parseInt(xmlhttp.responseText.match(/signatureTimestamp:([0-9]*)/)[1]);
    })();
  }

  function sendInnertubeRequest(endpoint, payload, useAuth) {
    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", `/youtubei/${endpoint}?key=${getYtcfgValue('INNERTUBE_API_KEY')}`, false);
    if (useAuth && isUserLoggedIn()) {
      xmlhttp.withCredentials = true;
      xmlhttp.setRequestHeader("Authorization", generateSidBasedAuth());
    }
    xmlhttp.send(JSON.stringify(payload));
    return nativeJSONParse(xmlhttp.responseText);
  }

  function getInnertubeEmbedPayload(videoId, clientConfig, playlistId, playlistIndex) {
    return {
      context: {
        client: {
          ...getYtcfgValue('INNERTUBE_CONTEXT').client,
          ...{ clientName: getMainPageClientName() },
          ...(clientConfig || {}) },

        thirdParty: {
          embedUrl: "https://www.youtube.com/" } },


      playbackContext: {
        contentPlaybackContext: {
          signatureTimestamp: getSignatureTimestamp() } },


      videoId,
      playlistId,
      playlistIndex };

  }

  function getSidCookie() {
    return getCookie('SAPISID') || getCookie('__Secure-3PAPISID');
  }

  function generateSidBasedAuth() {
    const sid = getSidCookie();
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const input = timestamp + " " + sid + " " + location.origin;
    const hash = generateSha1Hash(input);
    return `SAPISIDHASH ${timestamp}_${hash}`;
  }

  const logPrefix = "Simple-YouTube-Age-Restriction-Bypass:";
  const logSuffix = "You can report bugs at: https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues";

  function error(err, msg) {
    console.error(logPrefix, msg, err, getYtcfgDebugString(), logSuffix);
  }

  function info(msg) {
    console.info(logPrefix, msg);
  }

  function getYtcfgDebugString() {
    try {
      return `InnertubeConfig: ` +
      `innertubeApiKey: ${getYtcfgValue('INNERTUBE_API_KEY')} ` +
      `innertubeClientName: ${getYtcfgValue('INNERTUBE_CLIENT_NAME')} ` +
      `innertubeClientVersion: ${getYtcfgValue('INNERTUBE_CLIENT_VERSION')} ` +
      `loggedIn: ${getYtcfgValue('LOGGED_IN')} `;
    } catch (err) {
      return `Failed to access config: ${err}`;
    }
  }

  function getGoogleVideoUrl(originalUrl, proxyHost) {
    return proxyHost + "/direct/" + btoa(originalUrl);
  }

  function getPlayer(videoId, reason) {
    const queryParams = new URLSearchParams({
      videoId,
      reason,
      clientName: getMainPageClientName(),
      clientVersion: getYtcfgValue('INNERTUBE_CLIENT_VERSION'),
      signatureTimestamp: getSignatureTimestamp(),
      isEmbed: +location.pathname.includes("/embed/") }).
    toString();

    const proxyUrl = ACCOUNT_PROXY_SERVER_HOST + '/getPlayer?' + queryParams;

    const xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', proxyUrl, false);
    xmlhttp.send(null);

    const playerResponse = nativeJSONParse(xmlhttp.responseText);

    // mark request as 'proxied'
    playerResponse.proxied = true;

    return playerResponse;
  }

  var tDesktop = "<tp-yt-paper-toast></tp-yt-paper-toast>\r\n";

  var tMobile = "<c3-toast>\r\n    <ytm-notification-action-renderer>\r\n        <div class=\"notification-action-response-text\"></div>\r\n    </ytm-notification-action-renderer>\r\n</c3-toast>\r\n";

  const pageLoad = new Deferred();
  const pageLoadEventName = isDesktop ? 'yt-navigate-finish' : 'state-navigateend';

  const template = isDesktop ? tDesktop : tMobile;

  const nNotificationWrapper = createElement('div', { id: 'notification-wrapper', innerHTML: template });
  const nNotification = nNotificationWrapper.querySelector(':scope > *');
  const nMobileText = !isDesktop && nNotification.querySelector('.notification-action-response-text');

  window.addEventListener(pageLoadEventName, init, { once: true });

  function init() {
    document.body.append(nNotificationWrapper);
    pageLoad.resolve();
  }

  function show(message, duration = 5) {

    pageLoad.then(_show);

    function _show() {
      const _duration = duration * 1000;
      if (isDesktop) {
        nNotification.duration = _duration;
        nNotification.show(message);
      } else {
        nMobileText.innerText = message;
        nNotification.setAttribute('dir', 'in');
        setTimeout(() => {
          nNotification.setAttribute('dir', 'out');
        }, _duration + 225);
      }
    }
  }

  var Notification = { show };

  const messagesMap = {
    success: "Age-restricted video successfully unlocked!",
    fail: "Unable to unlock this video 🙁 - More information in the developer console" };


  const unlockStrategies = [
  // Strategy 1: Retrieve the video info by using a age-gate bypass for the innertube API
  // Source: https://github.com/yt-dlp/yt-dlp/issues/574#issuecomment-887171136
  {
    name: 'Innertube Embed',
    requireAuth: false,
    fn: (videoId) => getPlayer$1(videoId, { clientScreen: 'EMBED' }, false) },

  // Strategy 2: Retrieve the video info by using the WEB_CREATOR client in combination with user authentication
  // See https://github.com/yt-dlp/yt-dlp/pull/600
  {
    name: 'Innertube Creator + Auth',
    requireAuth: true,
    fn: (videoId) => getPlayer$1(videoId, { clientName: 'WEB_CREATOR', clientVersion: '1.20210909.07.00' }, true) },

  // Strategy 3: Retrieve the video info from an account proxy server.
  // See https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/tree/main/account-proxy
  {
    name: 'Account Proxy',
    requireAuth: false,
    fn: (videoId, reason) => getPlayer(videoId, reason) }];



  let lastProxiedGoogleVideoUrlParams;
  let responseCache = {};

  function getLastProxiedGoogleVideoId() {var _lastProxiedGoogleVid;
    return (_lastProxiedGoogleVid = lastProxiedGoogleVideoUrlParams) === null || _lastProxiedGoogleVid === void 0 ? void 0 : _lastProxiedGoogleVid.get("id");
  }

  function unlockPlayerResponse(playerResponse) {var _playerResponse$video, _playerResponse$playa, _playerResponse$previ, _unlockedPlayerRespon, _unlockedPlayerRespon3;
    const videoId = ((_playerResponse$video = playerResponse.videoDetails) === null || _playerResponse$video === void 0 ? void 0 : _playerResponse$video.videoId) || getYtcfgValue("PLAYER_VARS").video_id;
    const reason = ((_playerResponse$playa = playerResponse.playabilityStatus) === null || _playerResponse$playa === void 0 ? void 0 : _playerResponse$playa.status) || ((_playerResponse$previ = playerResponse.previewPlayabilityStatus) === null || _playerResponse$previ === void 0 ? void 0 : _playerResponse$previ.status);
    const unlockedPlayerResponse = getUnlockedPlayerResponse(videoId, reason);

    // account proxy error?
    if (unlockedPlayerResponse.errorMessage) {
      Notification.show(`${messagesMap.fail} (ProxyError)`, 10);
      throw new Error(`Player Unlock Failed, Proxy Error Message: ${unlockedPlayerResponse.errorMessage}`);
    }

    // check if the unlocked response isn't playable
    if (((_unlockedPlayerRespon = unlockedPlayerResponse.playabilityStatus) === null || _unlockedPlayerRespon === void 0 ? void 0 : _unlockedPlayerRespon.status) !== "OK") {var _unlockedPlayerRespon2;
      Notification.show(`${messagesMap.fail} (PlayabilityError)`, 10);
      throw new Error(`Player Unlock Failed, playabilityStatus: ${(_unlockedPlayerRespon2 = unlockedPlayerResponse.playabilityStatus) === null || _unlockedPlayerRespon2 === void 0 ? void 0 : _unlockedPlayerRespon2.status}`);
    }

    // if the video info was retrieved via proxy, store the URL params from the url-attribute to detect later if the requested video file (googlevideo.com) need a proxy.
    if (unlockedPlayerResponse.proxied && (_unlockedPlayerRespon3 = unlockedPlayerResponse.streamingData) !== null && _unlockedPlayerRespon3 !== void 0 && _unlockedPlayerRespon3.adaptiveFormats) {var _unlockedPlayerRespon4, _unlockedPlayerRespon5;
      const cipherText = (_unlockedPlayerRespon4 = unlockedPlayerResponse.streamingData.adaptiveFormats.find((x) => x.signatureCipher)) === null || _unlockedPlayerRespon4 === void 0 ? void 0 : _unlockedPlayerRespon4.signatureCipher;
      const videoUrl = cipherText ? new URLSearchParams(cipherText).get("url") : (_unlockedPlayerRespon5 = unlockedPlayerResponse.streamingData.adaptiveFormats.find((x) => x.url)) === null || _unlockedPlayerRespon5 === void 0 ? void 0 : _unlockedPlayerRespon5.url;

      lastProxiedGoogleVideoUrlParams = videoUrl ? new URLSearchParams(new URL(videoUrl).search) : null;
    }

    // Overwrite the embedded (preview) playabilityStatus with the unlocked one
    if (playerResponse.previewPlayabilityStatus) {
      playerResponse.previewPlayabilityStatus = unlockedPlayerResponse.playabilityStatus;
    }

    // Transfer all unlocked properties to the original player response
    Object.assign(playerResponse, unlockedPlayerResponse);

    Notification.show(messagesMap.success);
  }

  function getUnlockedPlayerResponse(videoId, reason) {
    // Check if response is cached
    if (responseCache.videoId === videoId) return responseCache.playerResponse;

    let playerResponse;

    unlockStrategies.every((strategy, index) => {var _playerResponse, _playerResponse$playa2;
      if (strategy.requireAuth && !isUserLoggedIn()) return true;

      info(`Trying Unlock Method #${index + 1} (${strategy.name})`);

      playerResponse = strategy.fn(videoId, reason);
      return ((_playerResponse = playerResponse) === null || _playerResponse === void 0 ? void 0 : (_playerResponse$playa2 = _playerResponse.playabilityStatus) === null || _playerResponse$playa2 === void 0 ? void 0 : _playerResponse$playa2.status) !== "OK";
    });

    // Cache response
    responseCache = { videoId, playerResponse };

    return playerResponse;
  }

  function unlockNextResponse(originalNextResponse) {
    info("Trying Sidebar Unlock Method (Innertube Embed)");

    const { videoId, playlistId, index: playlistIndex } = originalNextResponse.currentVideoEndpoint.watchEndpoint;
    const unlockedNextResponse = getNext(videoId, { clientScreen: 'EMBED' }, playlistId, playlistIndex);

    // check if the sidebar of the unlocked response is still empty
    if (isWatchNextSidebarEmpty(unlockedNextResponse)) {
      throw new Error(`Sidebar Unlock Failed`);
    }

    // Transfer some parts of the unlocked response to the original response
    mergeNextResponse(originalNextResponse, unlockedNextResponse);
  }

  function mergeNextResponse(originalNextResponse, unlockedNextResponse) {var _unlockedNextResponse, _unlockedNextResponse2, _unlockedNextResponse3, _unlockedNextResponse4, _unlockedNextResponse5;
    if (isDesktop) {
      // Transfer WatchNextResults to original response
      originalNextResponse.contents.twoColumnWatchNextResults.secondaryResults = unlockedNextResponse.contents.twoColumnWatchNextResults.secondaryResults;

      // Transfer video description to original response
      const originalVideoSecondaryInfoRenderer = originalNextResponse.contents.twoColumnWatchNextResults.results.results.contents.
      find((x) => x.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer;
      const unlockedVideoSecondaryInfoRenderer = unlockedNextResponse.contents.twoColumnWatchNextResults.results.results.contents.
      find((x) => x.videoSecondaryInfoRenderer).videoSecondaryInfoRenderer;

      if (unlockedVideoSecondaryInfoRenderer.description)
      originalVideoSecondaryInfoRenderer.description = unlockedVideoSecondaryInfoRenderer.description;

      return;
    }

    // Transfer WatchNextResults to original response
    const unlockedWatchNextFeed = (_unlockedNextResponse = unlockedNextResponse.contents) === null || _unlockedNextResponse === void 0 ? void 0 : (_unlockedNextResponse2 = _unlockedNextResponse.singleColumnWatchNextResults) === null || _unlockedNextResponse2 === void 0 ? void 0 : (_unlockedNextResponse3 = _unlockedNextResponse2.results) === null || _unlockedNextResponse3 === void 0 ? void 0 : (_unlockedNextResponse4 = _unlockedNextResponse3.results) === null || _unlockedNextResponse4 === void 0 ? void 0 : (_unlockedNextResponse5 = _unlockedNextResponse4.contents) === null || _unlockedNextResponse5 === void 0 ? void 0 : _unlockedNextResponse5.
    find((x) => {var _x$itemSectionRendere;return ((_x$itemSectionRendere = x.itemSectionRenderer) === null || _x$itemSectionRendere === void 0 ? void 0 : _x$itemSectionRendere.targetId) === "watch-next-feed";});

    if (unlockedWatchNextFeed)
    originalNextResponse.contents.singleColumnWatchNextResults.results.results.contents.push(unlockedWatchNextFeed);

    // Transfer video description to original response
    const originalStructuredDescriptionContentRenderer = originalNextResponse.engagementPanels.
    find((x) => x.engagementPanelSectionListRenderer).engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.
    find((x) => x.expandableVideoDescriptionBodyRenderer);
    const unlockedStructuredDescriptionContentRenderer = unlockedNextResponse.engagementPanels.
    find((x) => x.engagementPanelSectionListRenderer).engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.
    find((x) => x.expandableVideoDescriptionBodyRenderer);

    if (unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer)
    originalStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer = unlockedStructuredDescriptionContentRenderer.expandableVideoDescriptionBodyRenderer;
  }

  // This is just a state variable to handle age-restrictions in YouTube's embedded player.
  let isAgeRestrictedEmbeddedPlayer = false;

  try {
    attachInitialDataInterceptor(checkAndUnlock);
    attachJsonInterceptor(checkAndUnlock);
    attachXhrOpenInterceptor(onXhrOpenCalled);
  } catch (err) {
    error(err, "Error while attaching data interceptors");
  }

  function checkAndUnlock(ytData) {

    try {

      // Unlock #1: Initial page data structure and response from the '/youtubei/v1/player' endpoint
      if (isPlayerObject(ytData) && isAgeRestricted(ytData.playabilityStatus)) {
        unlockPlayerResponse(ytData);
      }
      // Unlock #2: Legacy response data structure (only used by m.youtube.com with &pbj=1)
      else if (isPlayerObject(ytData.playerResponse) && isAgeRestricted(ytData.playerResponse.playabilityStatus)) {
        unlockPlayerResponse(ytData.playerResponse);
      }
      // Unlock #3: Embedded Player inital data structure
      else if (isEmbeddedPlayerObject(ytData) && isAgeRestricted(ytData.previewPlayabilityStatus)) {
        isAgeRestrictedEmbeddedPlayer = true;
        unlockPlayerResponse(ytData);
      }
      // Unlock #4: Embedded Player response data structure (has no age-restriction indicator, therefore we use a state variable)
      else if (isPlayerObject(ytData) && isUnplayable(ytData.playabilityStatus) && isAgeRestrictedEmbeddedPlayer) {
        isAgeRestrictedEmbeddedPlayer = false;
        unlockPlayerResponse(ytData);
      }
      // Equivelant of unlock #1 for sidebar/next response
      else if (isWatchNextObject(ytData) && isWatchNextSidebarEmpty(ytData)) {
        unlockNextResponse(ytData);
      }
      // Equivelant of unlock #2 for sidebar/next response
      else if (isWatchNextObject(ytData.response) && isWatchNextSidebarEmpty(ytData.response)) {
        unlockNextResponse(ytData.response);
      }

    } catch (err) {
      error(err, "Video or sidebar unlock failed");
    }

    return ytData;
  }

  function onXhrOpenCalled(xhr, method, url) {

    if (!isGoogleVideo(method, url)) return;

    if (isGoogleVideoUnlockRequired(url, getLastProxiedGoogleVideoId())) {

      // If the account proxy was used to retrieve the video info, the following applies:
      // some video files (mostly music videos) can only be accessed from IPs in the same country as the innertube api request (/youtubei/v1/player) was made.
      // to get around this, the googlevideo URL will be replaced with a web-proxy URL in the same country (US).
      // this is only required if the "gcr=[countrycode]" flag is set in the googlevideo-url...

      // solve CORS errors by preventing YouTube from enabling the "withCredentials" option (required for the proxy)
      Object.defineProperty(xhr, "withCredentials", {
        set: () => {},
        get: () => false });


      return getGoogleVideoUrl(url.toString(), VIDEO_PROXY_SERVER_HOST);
    }
  }


})(true);
