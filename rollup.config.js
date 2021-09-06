import { resolve } from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import html from 'rollup-plugin-html';
import userscript from 'rollup-plugin-userscript';

function wrap_in_iife() {
    const [banner, footer] = (() => {
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

    return {
        name: 'wrap_in_iife',
        banner,
        footer,
    };
}

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/Simple-YouTube-Age-Restriction-Bypass.user.js',
        format: 'esm',
    },
    plugins: [
        html(),
        nodeResolve(),
        userscript(resolve(__dirname, 'userscript.config.js')),
        // Manually wrap code in our custom iife
        wrap_in_iife(),
        getBabelOutputPlugin({ configFile: resolve(__dirname, 'babel.config.js') }),
    ],
};
