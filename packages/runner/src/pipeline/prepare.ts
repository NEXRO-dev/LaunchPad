import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../logger.js';
import { execOrThrow } from '../exec.js';

const BUILD_DIR = process.env.BUILD_DIR || '/tmp/launchpad-build';

export interface PrepareResult {
    workDir: string;
}

export async function prepare(
    jobId: string,
    projectPath: string,
    logger: Logger
): Promise<PrepareResult> {
    await logger.step('Step 0: Prepare workspace');

    const workDir = path.join(BUILD_DIR, jobId);

    // Create work directory
    await logger.log(`Creating work directory: ${workDir}`);
    await fs.mkdir(workDir, { recursive: true });

    // Copy project using rsync
    await logger.log(`Copying project from: ${projectPath}`);
    await execOrThrow('rsync', [
        '-av',
        '--exclude', 'node_modules',
        '--exclude', '.git',
        '--exclude', 'ios',
        '--exclude', 'android',
        `${projectPath}/`,
        `${workDir}/`,
    ], logger);

    await logger.success(`Workspace prepared at ${workDir}`);

    return { workDir };
}
