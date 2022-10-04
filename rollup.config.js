import fs from 'fs';
import path from 'path';
import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import html from 'rollup-plugin-html';

import pkg from './package.json';
import manifest from './src/extension/mv3/manifest.json';

const EXTENSION_OUTPUT_DIR = 'dist/extension';
const EXTENSION_MAIN_SCRIPT_NAME = manifest.content_scripts[0].js[0];
const EXTENSION_WEB_SCRIPT_NAME = manifest.web_accessible_resources[0].resources[0];

const set_script_version = [
    ['%version%', pkg.version],
];

function transformString(str, transformer) {
    return transformer.reduce((_, x) => str.replace(...x), str);
}

function userscript(path, transformer = []) {
    const config = transformString(fs.readFileSync(path, 'utf8'), transformer);

    const iife = (() => {
        const [top, bottom] = (() => {
            (function iife(ranOnce) {
                // Trick to get around the sandbox restrictions in Greasemonkey (Firefox)
                // Inject code into the main window if criteria match
                if (this !== window && !ranOnce) {
                    window.eval('(' + iife.toString() + ')(true);');
                    return;
                }

                /* END */
            })();
        }).toString().slice(7, -1).split('/* END */');

        return { top, bottom };
    })();

    return {
        name: 'userscript',
        banner: config + iife.top,
        footer: iife.bottom,
    };
}

function copyExtensionAssets() {
    return {
        name: 'copyExtensionAssets',
        writeBundle() {
            const outputDir = `${EXTENSION_OUTPUT_DIR}/mv3`;
            const outputDirLegacy = outputDir.replace('3', '2');

            const assetPaths = [
                'src/extension/background.js',
                'src/extension/popup.js',
                'src/extension/multi-page-menu.css',
                'src/extension/multi-page-menu.js',
                'src/extension/icon/gray_16.png',
                'src/extension/icon/gray_48.png',
                'src/extension/icon/icon_16.png',
                'src/extension/icon/icon_48.png',
                'src/extension/icon/icon_128.png',
            ];

            for (const assetPath of assetPaths) {
                fs.cpSync(assetPath, path.join(outputDir, path.basename(assetPath)));
            }

            cpTransform('src/extension/popup.html', outputDir, set_script_version);

            // copy the above constructed folder in /mv2
            fs.cpSync(outputDir, outputDirLegacy, { recursive: true });

            cpTransform('src/extension/mv3/manifest.json', outputDir, set_script_version);

            cpTransform('src/extension/mv2/manifest.json', outputDirLegacy, set_script_version);

            function cpTransform(src, dest, transformer) {
                const fileContent = transformString(fs.readFileSync(src, 'utf8'), transformer);
                fs.mkdirSync(dest, { recursive: true });
                fs.writeFileSync(path.join(dest, path.basename(src)), fileContent);
            }
        },
    };
}

export default [
    {
        input: 'src/main.js',
        output: {
            file: 'dist/Simple-YouTube-Age-Restriction-Bypass.user.js',
            format: 'esm',
        },
        plugins: [
            replace({  __BUILD_TARGET__: `'USERSCRIPT'`, preventAssignment: true }),
            html(),
            nodeResolve(),
            commonjs(),
            userscript('userscript.config.js', set_script_version),
            getBabelOutputPlugin({
                presets: [ ['@babel/preset-env', { modules: false }] ],
                retainLines: true,
            }),
        ],
    },
    {
        input: 'src/main.js',
        output: {
            file: `${EXTENSION_OUTPUT_DIR}/mv3/${EXTENSION_WEB_SCRIPT_NAME}`,
            format: 'iife',
        },
        plugins: [
            replace({  __BUILD_TARGET__: `'WEB_EXTENSION'`, preventAssignment: true }),
            html(),
            nodeResolve(),
            commonjs(),
        ],
    },
    {
        input: 'src/extension/main.js',
        output: {
            file: `${EXTENSION_OUTPUT_DIR}/mv3/${EXTENSION_MAIN_SCRIPT_NAME}`,
            format: 'esm',
        },
        plugins: [copyExtensionAssets()],
    },
];
