import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const distDirectory = path.join(projectDirectory, 'dist');
const archivePath = path.join(projectDirectory, 'dist.tar.gz');

if (!existsSync(distDirectory)) {
    console.error('Cannot create dist.tar.gz: dist/ does not exist.');
    process.exit(1);
}

const result = spawnSync('tar', ['-czf', path.basename(archivePath), '-C', 'dist', '.'], {
    cwd: projectDirectory,
    stdio: 'inherit',
    windowsHide: true,
});

if (result.error) {
    console.error(`Cannot create dist.tar.gz: ${result.error.message}`);
    process.exit(1);
}

if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

console.log(`Created ${path.basename(archivePath)}`);