import { babel } from '@rollup/plugin-babel';
// import { terser } from "rollup-plugin-terser";
import userscript from 'rollup-plugin-userscript';

export default {
    input: 'src/main.js',
    output: {
        file: 'dist/Simple-YouTube-Age-Restriction-Bypass.user.js',
        format: 'iife',
    },
    plugins: [
        babel({ babelHelpers: 'bundled' }),
        userscript('userscript.config.js'),
        // terser({
        //     output: {
        //         comments: false,
        //     },
        // }),
    ],
};
