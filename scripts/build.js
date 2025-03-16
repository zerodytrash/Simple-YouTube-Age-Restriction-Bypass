import child_process from 'node:child_process';
import fs, { readFileSync } from 'node:fs';
import path from 'node:path';

import { getBabelOutputPlugin } from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { rollup } from 'rollup';

import archiver from 'archiver';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
const manifest = JSON.parse(readFileSync('./src/extension/mv3/manifest.json', 'utf8'));

const OUT_PATH = 'dist';

const WEB_EXTENSION_OUT_DIR = `${OUT_PATH}/extension`;
const WEB_EXTENSION_OUT_MAIN_SCRIPT_NAME = manifest.content_scripts[0].js[0];
const WEB_EXTENSION_OUT_WEB_SCRIPT_NAME = manifest.web_accessible_resources[0].resources[0];
const WEB_EXTENSION_OUT_MV2_ZIP_NAME = 'extension_mv2_firefox.zip';
const WEB_EXTENSION_OUT_MV3_ZIP_NAME = 'extension_mv3_chromium.zip';

const USERSCRIPT_OUT_DIR = OUT_PATH;
const USERSCRIPT_OUT_NAME = 'Simple-YouTube-Age-Restriction-Bypass.user.js';
const USERSCRIPT_CONFIG = `
// ==UserScript==
// @name            Simple YouTube Age Restriction Bypass
// @name:de         Einfache Umgehung der YouTube Altersbeschränkung
// @description     Watch YouTube videos with age restrictions without having to sign in and confirm the age 😎
// @description:de  YouTube-Videos mit Altersbeschränkungen ansehen, ohne sich anmelden und das Alter bestätigen zu müssen 😎.
// @description:dk  Se YouTube-videoer med aldersbegrænsninger uden at skulle logge ind og bekræfte din alder 😎.
// @description:es  Mira vídeos de YouTube con restricciones de edad sin tener que iniciar sesión y confirmar la edad 😎
// @description:fr  Regarde des vidéos YouTube avec des restrictions d'âge sans avoir à t'identifier et à confirmer ton âge 😎
// @description:it  Guarda i video di YouTube con limitazioni di età senza doverti registrare e confermare la tua età 😎
// @description:jp  年齢制限のあるYouTubeの動画を、ログインや年齢確認なしで視聴できるよ 😎
// @description:tr  Oturum açmak ve yaşınızı onaylamak zorunda kalmadan yaş sınırlaması olan YouTube videolarını izleyin 😎
// @description:uk  Переглядайте відео на YouTube з віковими обмеженнями без необхідності входу та підтвердження віку 😎.
// @icon            https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/v2.5.4/src/extension/icon/icon_64.png
// @version         __BUILD_VERSION__
// @author          Zerody (https://github.com/zerodytrash)
// @namespace       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass
// @supportURL      https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/issues
// @downloadURL     https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/dist/Simple-YouTube-Age-Restriction-Bypass.user.js
// @updateURL       https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass/raw/main/dist/Simple-YouTube-Age-Restriction-Bypass.user.js
// @license         MIT
// @match           https://*.youtube*.com/*
// @grant           none
// @run-at          document-start
// ==/UserScript==

/*
    This is a transpiled version to achieve a clean code base and better browser compatibility.
    You can find the nicely readable source code at https://github.com/zerodytrash/Simple-YouTube-Age-Restriction-Bypass
*/
`;

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
    function userscript() {
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
            banner: USERSCRIPT_CONFIG + iife.top,
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
            nodeResolve(),
            commonjs(),
            userscript(),
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
