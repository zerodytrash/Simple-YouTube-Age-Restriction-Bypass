import { babel } from '@rollup/plugin-babel';
import userscript from 'rollup-plugin-userscript';
import { nodeResolve } from '@rollup/plugin-node-resolve';

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
        name: 'wrap',
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
        babel({ babelHelpers: 'bundled' }),
        userscript('userscript.config.js'),
        // Manually wrap code in our custom iife
        wrap_in_iife(),
        nodeResolve(),
    ],
};
