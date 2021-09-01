import { wrap } from 'rollup-plugin-insert';
import { babel } from '@rollup/plugin-babel';
import userscript from 'rollup-plugin-userscript';

const wrapper = (() => {
    (function iife(inject) {
        // Trick to get around the sandbox restrictions in Greasemonkey (Firefox)
        // Inject code into the main window if criteria match
        if (typeof GM_info === "object" && GM_info.scriptHandler === "Greasemonkey" && inject) {
            window.eval("(" + iife.toString() + ")();");
            return;
        }

        /* == INJECTION == */
    })(true);
}).toString().slice(7, -1).split('/* == INJECTION == */');

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/Simple-YouTube-Age-Restriction-Bypass.user.js',
        format: 'esm',
    },
    plugins: [
        // Manually wrap code in our custom iife
        wrap(...wrapper),
        babel({ babelHelpers: 'bundled' }),
        userscript('userscript.config.js'),
    ],
};
