import fs from 'fs';

const EXTENSION_DIR = 'dist/extension';

if (fs.existsSync(EXTENSION_DIR)) {
    fs.rmSync(EXTENSION_DIR, { recursive: true });
}
