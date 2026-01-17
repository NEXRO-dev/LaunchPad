import * as path from 'path';
import { Logger } from '../logger.js';
import { execOrThrow } from '../exec.js';

export async function installPods(
    workDir: string,
    logger: Logger
): Promise<void> {
    await logger.step('Step 3: CocoaPods install');

    const iosDir = path.join(workDir, 'ios');

    await logger.log('Installing CocoaPods dependencies...');

    await execOrThrow('pod', ['install'], logger, {
        cwd: iosDir,
        env: {
            ...process.env,
            LANG: 'en_US.UTF-8',
        },
    });

    await logger.success('CocoaPods dependencies installed');
}
