import child_process from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { rollup } from 'rollup';
import html from 'rollup-plugin-html';

import archiver from 'archiver';

import pkg from '../package.json' assert { type: 'json' };
import manifest from '../src/extension/mv3/manifest.json' assert { type: 'json' };

const OUT_PATH = 'dist';

const USERSCRIPT_OUT_DIR = OUT_PATH;
const USERSCRIPT_OUT_NAME = 'Simple-YouTube-Age-Restriction-Bypass.user.js';

const WEB_EXTENSION_OUT_DIR = `${OUT_PATH}/extension`;
const WEB_EXTENSION_OUT_MAIN_SCRIPT_NAME = manifest.content_scripts[0].js[0];
const WEB_EXTENSION_OUT_WEB_SCRIPT_NAME = manifest.web_accessible_resources[0].resources[0];
const WEB_EXTENSION_OUT_MV2_ZIP_NAME = 'extension_mv2_firefox.zip';
const WEB_EXTENSION_OUT_MV3_ZIP_NAME = 'extension_mv3_chromium.zip';

console.time('\nTotal build time');

console.time('Cleaning /dist');
cleanOutput();
console.timeEnd('Cleaning /dist');

console.log('Building...');

console.time('    Userscript');
await buildUserscript();
console.timeEnd('    Userscript');

console.time('    Web Extension');
await buildWebExtension();
console.timeEnd('    Web Extension');

console.timeEnd('\nTotal build time');

async function build(opts) {
    const bundle = await rollup(opts);
    await bundle.write(opts.output);
    await bundle?.close();
}

function cleanOutput() {
    fs.rmSync(OUT_PATH, { force: true, recursive: true });
}

async function buildUserscript() {
    function userscript(path) {
        const config = fs.readFileSync(path, 'utf8');

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

    await build({
        input: 'src/main.js',
        output: {
            file: `${USERSCRIPT_OUT_DIR}/${USERSCRIPT_OUT_NAME}`,
            format: 'esm',
        },
        plugins: [
            html(),
            nodeResolve(),
            commonjs(),
            userscript('userscript.config.js'),
            replace({
                __BUILD_TARGET__: `'USERSCRIPT'`,
                __BUILD_VERSION__: pkg.version,
                preventAssignment: true,
            }),
            getBabelOutputPlugin({
                presets: [['@babel/preset-env', { modules: false }]],
                retainLines: true,
            }),
        ],
    });

    child_process.execSync(`dprint fmt ${USERSCRIPT_OUT_DIR}/${USERSCRIPT_OUT_NAME} --excludes-override !**/dist`);
}

async function buildWebExtension() {
    const outputPath = `${WEB_EXTENSION_OUT_DIR}/mv3`;
    const outputPathLegacy = outputPath.replace('3', '2');

    function archiveExtension([nameOne, pathOne], [nameTwo, pathTwo]) {
        return Promise.all([
            archiveDirectory(pathOne, nameOne),
            archiveDirectory(pathTwo, nameTwo),
        ]);

        async function archiveDirectory(src, name) {
            const archive = archiver('zip');
            archive.directory(src, false);
            await archive.finalize();
            archive.pipe(fs.createWriteStream(path.join(src, name)));
        }
    }

    function copyExtensionAssets() {
        const set_script_version = [
            ['%version%', pkg.version],
        ];

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
            fs.cpSync(assetPath, path.join(outputPath, path.basename(assetPath)));
        }

        cpTransform('src/extension/popup.html', outputPath, set_script_version);

        // copy the above constructed folder in /mv2
        fs.cpSync(outputPath, outputPathLegacy, { recursive: true });

        cpTransform('src/extension/mv3/manifest.json', outputPath, set_script_version);

        cpTransform('src/extension/mv2/manifest.json', outputPathLegacy, set_script_version);

        function cpTransform(src, dest, transformer) {
            const fileContent = transformString(fs.readFileSync(src, 'utf8'), transformer);
            fs.mkdirSync(dest, { recursive: true });
            fs.writeFileSync(path.join(dest, path.basename(src)), fileContent);
        }

        function transformString(str, transformer) {
            return transformer.reduce((_, x) => str.replace(...x), str);
        }
    }

    await build({
        input: 'src/main.js',
        output: {
            file: `${WEB_EXTENSION_OUT_DIR}/mv3/${WEB_EXTENSION_OUT_WEB_SCRIPT_NAME}`,
            format: 'iife',
        },
        plugins: [
            html(),
            nodeResolve(),
            commonjs(),
            replace({ __BUILD_TARGET__: `'WEB_EXTENSION'`, preventAssignment: true }),
        ],
    });

    await build({
        input: 'src/extension/main.js',
        output: {
            file: `${WEB_EXTENSION_OUT_DIR}/mv3/${WEB_EXTENSION_OUT_MAIN_SCRIPT_NAME}`,
            format: 'esm',
        },
    });

    copyExtensionAssets();

    await archiveExtension(
        [WEB_EXTENSION_OUT_MV3_ZIP_NAME, outputPath],
        [WEB_EXTENSION_OUT_MV2_ZIP_NAME, outputPathLegacy],
    );
}
