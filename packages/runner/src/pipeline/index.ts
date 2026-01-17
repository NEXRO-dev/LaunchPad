import { Logger } from '../logger.js';
import { prepare } from './prepare.js';
import { installDependencies } from './install.js';
import { prebuild } from './prebuild.js';
import { installPods } from './pods.js';
import { setupSigning } from './signing.js';
import { buildIpa } from './build.js';
import { uploadToAppStore } from './upload.js';
import { cleanup } from './cleanup.js';
import { getBundleIdentifier } from '../expo-config.js';

export interface PipelineInput {
    jobId: string;
    projectPath: string;
    profile: string;
    version: string;
    buildNumber: string;
    message?: string;
}

export interface PipelineResult {
    success: boolean;
    artifactPath?: string;
    error?: string;
}

export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
    const logger = new Logger(input.jobId);
    let workDir: string | null = null;
    let success = false;

    try {
        await logger.init();
        await logger.log(`Starting iOS build pipeline for job: ${input.jobId}`);
        await logger.log(`Project: ${input.projectPath}`);
        await logger.log(`Version: ${input.version} (${input.buildNumber})`);

        // Read Bundle ID from Expo config
        const bundleIdentifier = await getBundleIdentifier(input.projectPath);
        await logger.log(`Bundle ID: ${bundleIdentifier}`);

        // Step 0: Prepare workspace
        const prepResult = await prepare(input.jobId, input.projectPath, logger);
        workDir = prepResult.workDir;

        // Step 1: Install dependencies
        await installDependencies(workDir, logger);

        // Step 2: Expo prebuild
        await prebuild(workDir, logger);

        // Step 3: CocoaPods install
        await installPods(workDir, logger);

        // Step 4: Code signing (with auto-detected Bundle ID)
        await setupSigning(workDir, bundleIdentifier, logger);

        // Step 5: Build IPA
        const buildResult = await buildIpa(
            workDir,
            input.jobId,
            input.version,
            input.buildNumber,
            logger
        );

        // Step 6: Upload to App Store Connect
        await uploadToAppStore(buildResult.ipaPath, logger);

        // Step 7: Cleanup (success)
        success = true;
        await cleanup(workDir, success, logger);

        await logger.log('\n🎉 Pipeline completed successfully!');
        await logger.close();

        return {
            success: true,
            artifactPath: buildResult.ipaPath,
        };
    } catch (error: any) {
        await logger.error(error.message);
        await logger.log(`\n❌ Pipeline failed: ${error.message}`);

        // Cleanup (failure - keep work dir)
        if (workDir) {
            await cleanup(workDir, false, logger);
        }

        await logger.close();

        return {
            success: false,
            error: error.message,
        };
    }
}
