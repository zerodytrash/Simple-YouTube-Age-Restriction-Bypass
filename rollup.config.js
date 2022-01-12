import fs from 'fs';
import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel, { getBabelOutputPlugin } from '@rollup/plugin-babel';
import html from 'rollup-plugin-html';
import pkg from './package.json';
import manifest from './src/extension/manifest.json';

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
    const fileContent = fs.readFileSync(path, 'utf8');
    return {
        name: "add_header_file",
        banner: transform ? transform(fileContent) : fileContent
    }
}

function set_script_version(meta) {
    return meta.replace('%version%', pkg.version);
}

function copy({ src, dest }) {
    return {
        name: 'copy',
        buildEnd() {
            fs.mkdirSync(dest, { recursive: true })
            fs.copyFileSync(src, path.join(dest, path.basename(src)));
        },
    };
}

const EXTENSION_OUTPUT_DIR = 'dist/extension';
const EXTENSION_MAIN_SCRIPT_NAME = manifest.content_scripts[0].js[0];
const EXTENSION_WEB_SCRIPT_NAME = manifest.web_accessible_resources[0].resources[0];

export default [
    {
        input: 'src/main.js',
        output: {
            file: 'dist/Simple-YouTube-Age-Restriction-Bypass.user.js',
            format: 'esm',
        },
        plugins: [
            html(),
            nodeResolve(),
            add_header_file('userscript.config.js', set_script_version),
            // Manually wrap code in our custom iife
            wrap_in_iife(),
            getBabelOutputPlugin({ configFile: './babel.config.js' }),
        ],
    },
    {
        input: 'src/main.js',
        output: {
            file: `${EXTENSION_OUTPUT_DIR}/${EXTENSION_WEB_SCRIPT_NAME}`,
            format: 'iife',
        },
        plugins: [
            html(),
            nodeResolve(),
            // babel({ babelHelpers: 'bundled' }),
        ],
    },
    {
        input: 'src/extension/main.js',
        output: {
            file: `${EXTENSION_OUTPUT_DIR}/${EXTENSION_MAIN_SCRIPT_NAME}`,
            format: 'esm',
        },
        plugins: [
            // babel({ babelHelpers: 'bundled' }),
            copy({ src: 'src/extension/manifest.json', dest: EXTENSION_OUTPUT_DIR }),
            copy({ src: 'src/extension/icon/icon_16.png', dest: EXTENSION_OUTPUT_DIR }),
            copy({ src: 'src/extension/icon/icon_48.png', dest: EXTENSION_OUTPUT_DIR }),
            copy({ src: 'src/extension/icon/icon_128.png', dest: EXTENSION_OUTPUT_DIR }),
        ],
    },
];
