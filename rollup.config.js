import fs from 'fs';
import path from 'path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import html from 'rollup-plugin-html';
import pkg from './package.json';
import manifest from './src/extension/mv3/manifest.json';

const EXTENSION_OUTPUT_DIR = 'dist/extension';
const EXTENSION_MAIN_SCRIPT_NAME = manifest.content_scripts[0].js[0];
const EXTENSION_WEB_SCRIPT_NAME = manifest.web_accessible_resources[0].resources[0];

function wrap_in_iife() {
    const [banner, footer] = (() => {
        (function iife(inject) {
            // Trick to get around the sandbox restrictions in Greasemonkey (Firefox)
            // Inject code into the main window if criteria match
            if (this !== window && inject) {
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

function copy({ src, dest, transform }) {
    return {
        name: 'copy',
        buildEnd() {
            fs.mkdirSync(dest, { recursive: true });
            const fileContent = transform ? transform(fs.readFileSync(src, 'utf8')) : fs.readFileSync(src);
            fs.writeFileSync(path.join(dest, path.basename(src)), fileContent);
        },
    };
}

function getRollupPluginsForManifestVersion(manifestVersion) {
    const outputDir = EXTENSION_OUTPUT_DIR + '/mv' + manifestVersion;
    return [
        copy({ src: `src/extension/mv${manifestVersion}/manifest.json`, dest: outputDir, transform: set_script_version }),
        copy({ src: 'src/extension/background.js', dest: outputDir }),
        copy({ src: 'src/extension/popup.html', dest: outputDir, transform: set_script_version }),
        copy({ src: 'src/extension/popup.js', dest: outputDir }),
        copy({ src: 'src/extension/multi-page-menu.css', dest: outputDir }),
        copy({ src: 'src/extension/multi-page-menu.js', dest: outputDir }),
        copy({ src: 'src/extension/icon/gray_16.png', dest: outputDir }),
        copy({ src: 'src/extension/icon/gray_48.png', dest: outputDir }),
        copy({ src: 'src/extension/icon/icon_16.png', dest: outputDir }),
        copy({ src: 'src/extension/icon/icon_48.png', dest: outputDir }),
        copy({ src: 'src/extension/icon/icon_128.png', dest: outputDir }),
    ]
}

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
        output: [
            {
                file: `${EXTENSION_OUTPUT_DIR}/mv2/${EXTENSION_WEB_SCRIPT_NAME}`,
                format: 'iife',
            },
            {
                file: `${EXTENSION_OUTPUT_DIR}/mv3/${EXTENSION_WEB_SCRIPT_NAME}`,
                format: 'iife',
            }
        ],
        plugins: [
            html(),
            nodeResolve(),
        ],
    },
    {
        input: 'src/extension/main.js',
        output: [
            {
                file: `${EXTENSION_OUTPUT_DIR}/mv2/${EXTENSION_MAIN_SCRIPT_NAME}`,
                format: 'esm',
            },
            {
                file: `${EXTENSION_OUTPUT_DIR}/mv3/${EXTENSION_MAIN_SCRIPT_NAME}`,
                format: 'esm',
            }
        ],
        plugins: [
            ...getRollupPluginsForManifestVersion(2),
            ...getRollupPluginsForManifestVersion(3),
        ],
    },
];
