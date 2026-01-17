import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as crypto from 'crypto';
import { Logger } from '../logger.js';
import { execOrThrow, exec } from '../exec.js';

/**
 * Automatic code signing using App Store Connect API
 * Similar to how EAS Build handles certificates automatically
 * 
 * @param workDir - The working directory for the build
 * @param bundleIdentifier - Bundle ID from Expo project's app.json
 * @param logger - Logger instance
 */
export async function setupSigning(
  workDir: string,
  bundleIdentifier: string,
  logger: Logger
): Promise<void> {
  await logger.step('Step 4: Code signing (automatic)');

  // Validate required environment variables
  const ascKeyId = process.env.ASC_KEY_ID;
  const ascIssuerId = process.env.ASC_ISSUER_ID;
  const ascKeyPath = process.env.ASC_KEY_PATH;
  const teamId = process.env.TEAM_ID;

  if (!ascKeyId || !ascIssuerId || !ascKeyPath) {
    throw new Error('Missing App Store Connect API credentials (ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH)');
  }

  if (!teamId) {
    throw new Error('Missing TEAM_ID environment variable');
  }

  await logger.log(`Setting up automatic code signing for ${bundleIdentifier}...`);

  // Create temporary keychain for CI builds
  const keychainName = `launchpad-${Date.now()}.keychain`;
  const keychainPassword = crypto.randomBytes(16).toString('hex');
  const keychainPath = path.join(os.homedir(), 'Library/Keychains', keychainName);

  await logger.log('Creating temporary keychain...');

  try {
    // Create keychain
    await execOrThrow('security', ['create-keychain', '-p', keychainPassword, keychainName], logger);

    // Set keychain settings
    await execOrThrow('security', ['set-keychain-settings', '-lut', '21600', keychainPath], logger);

    // Unlock keychain
    await execOrThrow('security', ['unlock-keychain', '-p', keychainPassword, keychainPath], logger);

    // Add to search list
    const { stdout: existingKeychains } = await exec('security', ['list-keychains', '-d', 'user'], logger);
    const keychainList = existingKeychains
      .split('\n')
      .map(k => k.trim().replace(/"/g, ''))
      .filter(k => k.length > 0);

    await execOrThrow('security', [
      'list-keychains', '-d', 'user', '-s',
      keychainPath,
      ...keychainList
    ], logger);

    // Use fastlane to handle certificate with API key auth
    await logger.log('Fetching/creating distribution certificate...');

    const iosDir = path.join(workDir, 'ios');
    const fastlaneDir = path.join(iosDir, 'fastlane');
    await fs.mkdir(fastlaneDir, { recursive: true });

    // Create Fastfile for automatic signing
    const fastfileContent = `
default_platform(:ios)

platform :ios do
  desc "Setup signing"
  lane :setup_signing do
    # Create App Store Connect API key
    api_key = app_store_connect_api_key(
      key_id: "${ascKeyId}",
      issuer_id: "${ascIssuerId}",
      key_filepath: "${ascKeyPath}",
      in_house: false
    )

    # Get or create distribution certificate
    cert(
      api_key: api_key,
      team_id: "${teamId}",
      keychain_path: "${keychainPath}",
      keychain_password: "${keychainPassword}",
      generate_apple_certs: true
    )

    # Get or create provisioning profile
    sigh(
      api_key: api_key,
      app_identifier: "${bundleIdentifier}",
      team_id: "${teamId}",
      force: true,
      adhoc: false
    )

    # Update Xcode project with signing settings
    update_code_signing_settings(
      use_automatic_signing: false,
      path: Dir.glob("*.xcodeproj").first,
      team_id: "${teamId}",
      bundle_identifier: "${bundleIdentifier}",
      profile_name: lane_context[SharedValues::SIGH_NAME],
      code_sign_identity: "iPhone Distribution"
    )
  end
end
`;

    await fs.writeFile(path.join(fastlaneDir, 'Fastfile'), fastfileContent);

    // Run fastlane to setup signing
    await execOrThrow('fastlane', ['setup_signing'], logger, {
      cwd: iosDir,
      env: {
        ...process.env,
        FASTLANE_SKIP_UPDATE_CHECK: '1',
        FASTLANE_HIDE_CHANGELOG: '1',
      },
    });

    await logger.success('Code signing configured automatically');

  } catch (error) {
    // Cleanup keychain on failure
    await exec('security', ['delete-keychain', keychainPath], logger).catch(() => { });
    throw error;
  }
}
