import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const EXTENSION_DIR = 'dist/extension';
const EXTENSION_OUTPUT_FILE_NAME = 'bundle.zip';

const archive = archiver('zip');

archive.directory(EXTENSION_DIR, false);

// wait for archive to finalize before creating a file in the same directory
await archive.finalize();

archive.pipe(fs.createWriteStream(path.join(EXTENSION_DIR, EXTENSION_OUTPUT_FILE_NAME)));
