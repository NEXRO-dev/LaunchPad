import * as path from 'path';
import * as fs from 'fs/promises';
import { Logger } from '../logger.js';
import { execOrThrow, exec } from '../exec.js';

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(process.cwd(), '../server/artifacts');

export interface BuildResult {
    ipaPath: string;
}

export async function buildIpa(
    workDir: string,
    jobId: string,
    version: string,
    buildNumber: string,
    logger: Logger
): Promise<BuildResult> {
    await logger.step('Step 5: Build IPA');

    const iosDir = path.join(workDir, 'ios');
    const outputDir = path.join(ARTIFACTS_DIR, jobId);

    await fs.mkdir(outputDir, { recursive: true });

    // Find the .xcworkspace
    const files = await fs.readdir(iosDir);
    const workspace = files.find(f => f.endsWith('.xcworkspace'));

    if (!workspace) {
        throw new Error('No .xcworkspace found in ios directory');
    }

    const workspacePath = path.join(iosDir, workspace);
    const appName = workspace.replace('.xcworkspace', '');

    // Update version and build number in Info.plist
    await logger.log(`Setting version to ${version} (${buildNumber})`);

    const infoPlistPath = path.join(iosDir, appName, 'Info.plist');

    await execOrThrow('/usr/libexec/PlistBuddy', [
        '-c', `Set :CFBundleShortVersionString ${version}`,
        infoPlistPath,
    ], logger);

    await execOrThrow('/usr/libexec/PlistBuddy', [
        '-c', `Set :CFBundleVersion ${buildNumber}`,
        infoPlistPath,
    ], logger);

    // Create Fastlane Gymfile
    const gymfileContent = `
workspace("${workspacePath}")
scheme("${appName}")
export_method("app-store")
output_directory("${outputDir}")
output_name("${appName}")
clean(true)
`;

    const fastlaneDir = path.join(iosDir, 'fastlane');
    await fs.mkdir(fastlaneDir, { recursive: true });
    await fs.writeFile(path.join(fastlaneDir, 'Gymfile'), gymfileContent);

    await logger.log('Building with fastlane gym...');

    await execOrThrow('fastlane', ['gym'], logger, {
        cwd: iosDir,
        env: {
            ...process.env,
            FASTLANE_SKIP_UPDATE_CHECK: '1',
        },
    });

    const ipaPath = path.join(outputDir, `${appName}.ipa`);

    // Verify IPA exists
    try {
        await fs.access(ipaPath);
    } catch {
        throw new Error(`IPA not found at ${ipaPath}`);
    }

    await logger.success(`IPA built: ${ipaPath}`);

    return { ipaPath };
}
