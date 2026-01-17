import * as fs from 'fs/promises';
import { Logger } from '../logger.js';

export async function cleanup(
    workDir: string,
    success: boolean,
    logger: Logger
): Promise<void> {
    await logger.step('Step 7: Cleanup');

    if (success) {
        await logger.log(`Removing work directory: ${workDir}`);
        try {
            await fs.rm(workDir, { recursive: true, force: true });
            await logger.success('Cleanup completed');
        } catch (error: any) {
            await logger.log(`Warning: Failed to clean up work directory: ${error.message}`);
        }
    } else {
        await logger.log(`Keeping work directory for debugging: ${workDir}`);
    }
}
