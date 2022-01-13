import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

const EXTENSION_DIR_MV2 = 'dist/extension/mv2';
const EXTENSION_DIR_MV3 = 'dist/extension/mv3';
const EXTENSION_OUTPUT_FILE_NAME = 'bundle.zip';

async function archiveExtension(extensionDir, outputFileName) {
    const archive = archiver('zip');

    archive.directory(extensionDir, false);
    
    // wait for archive to finalize before creating a file in the same directory
    await archive.finalize();
    
    archive.pipe(fs.createWriteStream(path.join(extensionDir, outputFileName)));
}

await archiveExtension(EXTENSION_DIR_MV2, EXTENSION_OUTPUT_FILE_NAME);
await archiveExtension(EXTENSION_DIR_MV3, EXTENSION_OUTPUT_FILE_NAME);