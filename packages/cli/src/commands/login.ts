import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';

export function loginCommand(program: Command): void {
    program
        .command('login')
        .description('Setup Apple Developer credentials and fetch Team ID')
        .option('--key-id <id>', 'App Store Connect API Key ID')
        .option('--issuer-id <id>', 'App Store Connect Issuer ID')
        .option('--key-path <path>', 'Path to .p8 API key file')
        .action(async (options) => {
            const spinner = ora('Verifying Apple Developer credentials...').start();

            try {
                // Get credentials from options or environment
                const keyId = options.keyId || process.env.ASC_KEY_ID;
                const issuerId = options.issuerId || process.env.ASC_ISSUER_ID;
                const keyPath = options.keyPath || process.env.ASC_KEY_PATH;

                if (!keyId || !issuerId || !keyPath) {
                    spinner.fail('Missing credentials');
                    console.log();
                    console.log(chalk.yellow('Please provide App Store Connect API credentials:'));
                    console.log();
                    console.log('  1. Go to https://appstoreconnect.apple.com');
                    console.log('  2. Navigate to Users and Access > Keys');
                    console.log('  3. Create an API Key with Admin access');
                    console.log('  4. Download the .p8 file');
                    console.log();
                    console.log('  Then run:');
                    console.log(chalk.cyan('    launchpad-submit login --key-id <KEY_ID> --issuer-id <ISSUER_ID> --key-path <path/to/.p8>'));
                    console.log();
                    process.exit(1);
                }

                // Verify the key file exists
                try {
                    await fs.access(keyPath);
                } catch {
                    spinner.fail('API key file not found');
                    console.log(chalk.red(`\nFile not found: ${keyPath}`));
                    process.exit(1);
                }

                // Read the private key to verify it's valid
                const privateKey = await fs.readFile(keyPath, 'utf-8');
                if (!privateKey.includes('BEGIN PRIVATE KEY')) {
                    spinner.fail('Invalid API key file');
                    console.log(chalk.red('\nThe file does not appear to be a valid .p8 API key'));
                    process.exit(1);
                }

                // Generate JWT token for App Store Connect API
                const token = generateJWT(keyId, issuerId, privateKey);

                spinner.text = 'Connecting to App Store Connect...';

                // Test the API connection
                const response = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=1', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    spinner.fail('Authentication failed');
                    const errorData = await response.json().catch(() => ({}));
                    console.log(chalk.red(`\nAPI Error: ${response.status}`));
                    console.log(chalk.dim(JSON.stringify(errorData, null, 2)));
                    process.exit(1);
                }

                spinner.succeed('Successfully connected to Apple Developer!');
                console.log();

                // Display credentials info
                console.log(chalk.bold('Your Credentials:'));
                console.log(chalk.dim('─'.repeat(50)));
                console.log(`  ${chalk.dim('API Key ID:')}   ${chalk.cyan(keyId)}`);
                console.log(`  ${chalk.dim('Issuer ID:')}    ${chalk.cyan(issuerId)}`);
                console.log(`  ${chalk.dim('Key File:')}     ${keyPath}`);
                console.log();

                // Explain Team ID
                console.log(chalk.bold('About Team ID:'));
                console.log(chalk.dim('─'.repeat(50)));
                console.log('  Team ID can be found at:');
                console.log(`  ${chalk.cyan('https://developer.apple.com/account')} > Membership`);
                console.log();
                console.log('  It looks like: ' + chalk.cyan('ABC123XYZ') + ' (10 alphanumeric characters)');
                console.log();

                // Show .env configuration
                console.log(chalk.green('✅ Add these to your .env file:'));
                console.log();
                console.log(chalk.dim('  # Apple Developer Credentials'));
                console.log(`  ASC_KEY_ID=${keyId}`);
                console.log(`  ASC_ISSUER_ID=${issuerId}`);
                console.log(`  ASC_KEY_PATH=${keyPath}`);
                console.log(`  TEAM_ID=<your-team-id-from-developer-portal>`);
                console.log();

            } catch (error: any) {
                spinner.fail('Failed to connect');
                console.error(chalk.red(`\nError: ${error.message}`));
                process.exit(1);
            }
        });
}

function generateJWT(keyId: string, issuerId: string, privateKey: string): string {
    // Create JWT header
    const header = {
        alg: 'ES256',
        kid: keyId,
        typ: 'JWT',
    };

    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: issuerId,
        iat: now,
        exp: now + 1200, // 20 minutes
        aud: 'appstoreconnect-v1',
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    // Sign with ES256
    const sign = crypto.createSign('SHA256');
    sign.update(signatureInput);
    const signature = sign.sign(privateKey);

    // Convert to base64url
    const encodedSignature = base64UrlEncode(signature);

    return `${signatureInput}.${encodedSignature}`;
}

function base64UrlEncode(data: string | Buffer): string {
    const base64 = Buffer.isBuffer(data)
        ? data.toString('base64')
        : Buffer.from(data).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
