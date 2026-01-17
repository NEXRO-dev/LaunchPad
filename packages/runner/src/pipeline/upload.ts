import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../logger.js';
import { execOrThrow } from '../exec.js';

export async function uploadToAppStore(
    ipaPath: string,
    logger: Logger
): Promise<void> {
    await logger.step('Step 6: Upload to App Store Connect');

    // Validate required environment variables for API key auth
    const ascKeyId = process.env.ASC_KEY_ID;
    const ascIssuerId = process.env.ASC_ISSUER_ID;
    const ascKeyPath = process.env.ASC_KEY_PATH; // Path to .p8 file
    const ascKeyContent = process.env.ASC_KEY_CONTENT; // Or direct content

    if (!ascKeyId || !ascIssuerId) {
        throw new Error('Missing ASC_KEY_ID or ASC_ISSUER_ID environment variables');
    }

    if (!ascKeyPath && !ascKeyContent) {
        throw new Error('Missing ASC_KEY_PATH or ASC_KEY_CONTENT environment variable');
    }

    // If key content is provided, write to temp file
    let keyPath = ascKeyPath;
    let tempKeyFile: string | null = null;

    if (ascKeyContent && !ascKeyPath) {
        tempKeyFile = path.join(os.tmpdir(), `launchpad-asc-key-${Date.now()}.p8`);
        await fs.writeFile(tempKeyFile, ascKeyContent);
        keyPath = tempKeyFile;
    }

    await logger.log('Uploading IPA to App Store Connect...');

    try {
        // Use xcrun altool or xcrun notarytool for upload
        // For App Store uploads, we use xcrun altool
        await execOrThrow('xcrun', [
            'altool',
            '--upload-app',
            '--type', 'ios',
            '--file', ipaPath,
            '--apiKey', ascKeyId!,
            '--apiIssuer', ascIssuerId!,
        ], logger, {
            env: {
                ...process.env,
                // altool looks for the API key in specific locations
                // We need to set up the private_keys directory
            },
        });

        await logger.success('App uploaded to App Store Connect');
    } finally {
        // Clean up temp key file
        if (tempKeyFile) {
            await fs.unlink(tempKeyFile).catch(() => { });
        }
    }
}

// Alternative upload method using Transporter CLI
export async function uploadWithTransporter(
    ipaPath: string,
    logger: Logger
): Promise<void> {
    await logger.step('Step 6: Upload to App Store Connect (Transporter)');

    const ascKeyId = process.env.ASC_KEY_ID;
    const ascIssuerId = process.env.ASC_ISSUER_ID;
    const ascKeyPath = process.env.ASC_KEY_PATH;

    if (!ascKeyId || !ascIssuerId || !ascKeyPath) {
        throw new Error('Missing ASC_KEY_ID, ASC_ISSUER_ID, or ASC_KEY_PATH');
    }

    await logger.log('Uploading IPA using iTMSTransporter...');

    // iTMSTransporter path on macOS
    const transporterPath = '/Applications/Transporter.app/Contents/itms/bin/iTMSTransporter';

    // Check if Transporter is installed
    try {
        await fs.access(transporterPath);
    } catch {
        throw new Error('Transporter not found. Please install Transporter from the Mac App Store.');
    }

    await execOrThrow(transporterPath, [
        '-m', 'upload',
        '-f', ipaPath,
        '-apiKey', ascKeyPath,
        '-apiIssuer', ascIssuerId,
    ], logger);

    await logger.success('App uploaded to App Store Connect via Transporter');
}
