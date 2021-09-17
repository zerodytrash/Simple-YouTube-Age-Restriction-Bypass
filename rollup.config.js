import { readFileSync } from 'fs';
import { resolve } from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import html from 'rollup-plugin-html';
import pkg from './package.json';

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

function add_header_file(path, transform) {
    const fileContent = readFileSync(path, 'utf8');
    return {
        name: "add_header_file",
        banner: transform ? transform(fileContent) : fileContent
    }
}

function set_script_version(meta) {
    return meta.replace('%version%', pkg.version);
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
        add_header_file(resolve(__dirname, 'userscript.config.js'), set_script_version),
        // Manually wrap code in our custom iife
        wrap_in_iife(),
        getBabelOutputPlugin({ configFile: resolve(__dirname, 'babel.config.js') }),
    ],
};
