import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const ignoredDirectories = new Set(['node_modules', '.git', '.vercel']);

function collectJavaScriptFiles(directory) {
    const files = [];

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (ignoredDirectories.has(entry.name)) {
            continue;
        }

        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...collectJavaScriptFiles(fullPath));
        } else if (/\.(?:js|mjs)$/.test(entry.name)) {
            files.push(fullPath);
        }
    }

    return files;
}

for (const file of collectJavaScriptFiles(projectRoot)) {
    execFileSync(process.execPath, ['--check', file], {
        stdio: 'inherit'
    });
}

const tempDirectory = mkdtempSync(path.join(tmpdir(), 'wedding-html-check-'));

try {
    for (const htmlName of ['admin.html', 'invitation.html']) {
        const htmlPath = path.join(projectRoot, 'public', htmlName);
        const html = readFileSync(htmlPath, 'utf8');
        const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];

        scripts.forEach((match, index) => {
            const scriptPath = path.join(
                tempDirectory,
                `${htmlName.replace('.html', '')}-${index}.js`
            );
            writeFileSync(scriptPath, match[1]);
            execFileSync(process.execPath, ['--check', scriptPath], {
                stdio: 'inherit'
            });
        });
    }
} finally {
    rmSync(tempDirectory, {
        recursive: true,
        force: true
    });
}

console.log('JavaScript and inline HTML scripts passed syntax validation.');
