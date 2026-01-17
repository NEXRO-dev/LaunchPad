import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../logger.js';
import { execOrThrow, exec } from '../exec.js';

export async function installDependencies(
    workDir: string,
    logger: Logger
): Promise<void> {
    await logger.step('Step 1: Install dependencies');

    // Check for package manager lockfiles
    const hasPnpmLock = await fileExists(path.join(workDir, 'pnpm-lock.yaml'));
    const hasYarnLock = await fileExists(path.join(workDir, 'yarn.lock'));
    const hasNpmLock = await fileExists(path.join(workDir, 'package-lock.json'));

    if (hasPnpmLock) {
        await logger.log('Detected pnpm-lock.yaml, using pnpm');
        await execOrThrow('pnpm', ['install', '--frozen-lockfile'], logger, { cwd: workDir });
    } else if (hasYarnLock) {
        await logger.log('Detected yarn.lock, using yarn');
        await execOrThrow('yarn', ['install', '--frozen-lockfile'], logger, { cwd: workDir });
    } else if (hasNpmLock) {
        await logger.log('Detected package-lock.json, using npm ci');
        await execOrThrow('npm', ['ci'], logger, { cwd: workDir });
    } else {
        await logger.log('No lockfile found, using npm install');
        await execOrThrow('npm', ['install'], logger, { cwd: workDir });
    }

    await logger.success('Dependencies installed');
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}
