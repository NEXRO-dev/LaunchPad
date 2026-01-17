import { Logger } from '../logger.js';
import { execOrThrow } from '../exec.js';

export async function prebuild(
    workDir: string,
    logger: Logger
): Promise<void> {
    await logger.step('Step 2: Expo prebuild');

    await logger.log('Running expo prebuild for iOS...');

    await execOrThrow('npx', [
        'expo',
        'prebuild',
        '-p', 'ios',
        '--no-install',
        '--clean',
    ], logger, { cwd: workDir });

    await logger.success('iOS native project generated');
}
