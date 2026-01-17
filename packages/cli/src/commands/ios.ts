import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { api } from '../api.js';

export function iosCommand(program: Command): void {
    program
        .command('ios')
        .description('Submit iOS app to App Store Connect')
        .requiredOption('--project <path>', 'Path to Expo project')
        .requiredOption('--version <version>', 'App version (e.g., 1.0.0)')
        .requiredOption('--build <number>', 'Build number')
        .option('--profile <name>', 'Build profile name', 'production')
        .option('--message <text>', 'Release notes / message')
        .option('--wait', 'Wait for job completion', false)
        .action(async (options) => {
            const spinner = ora('Creating iOS build job...').start();

            try {
                const result = await api.createiOSJob({
                    projectPath: options.project,
                    profile: options.profile,
                    version: options.version,
                    buildNumber: options.build,
                    message: options.message,
                });

                spinner.succeed(`Job created: ${chalk.cyan(result.jobId)}`);
                console.log(`\n  ${chalk.dim('Check status:')} launchpad-submit status ${result.jobId}`);
                console.log(`  ${chalk.dim('View logs:')} launchpad-submit logs ${result.jobId}\n`);

                if (options.wait) {
                    await waitForCompletion(result.jobId);
                }
            } catch (error: any) {
                spinner.fail('Failed to create job');
                if (error.response?.data?.error) {
                    console.error(chalk.red(`Error: ${error.response.data.error}`));
                } else {
                    console.error(chalk.red(`Error: ${error.message}`));
                }
                process.exit(1);
            }
        });
}

async function waitForCompletion(jobId: string): Promise<void> {
    const spinner = ora('Waiting for job completion...').start();
    const startTime = Date.now();
    const timeout = 60 * 60 * 1000; // 60 minutes

    while (true) {
        try {
            const status = await api.getJobStatus(jobId);

            spinner.text = `Status: ${getStatusText(status.status)}`;

            if (status.status === 'done') {
                spinner.succeed(chalk.green('Build completed and uploaded successfully!'));
                if (status.artifactPath) {
                    console.log(`\n  ${chalk.dim('Artifact:')} ${status.artifactPath}\n`);
                }
                return;
            }

            if (status.status === 'failed') {
                spinner.fail(chalk.red('Build failed'));
                if (status.error) {
                    console.error(chalk.red(`\n  Error: ${status.error}\n`));
                }
                process.exit(1);
            }

            // Check timeout
            if (Date.now() - startTime > timeout) {
                spinner.fail('Job timed out after 60 minutes');
                process.exit(1);
            }

            // Poll every 5 seconds
            await sleep(5000);
        } catch (error: any) {
            spinner.fail('Failed to check status');
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    }
}

function getStatusText(status: string): string {
    switch (status) {
        case 'queued':
            return chalk.yellow('⏳ Queued');
        case 'building':
            return chalk.blue('🔨 Building...');
        case 'uploading':
            return chalk.magenta('📤 Uploading...');
        case 'done':
            return chalk.green('✅ Done');
        case 'failed':
            return chalk.red('❌ Failed');
        default:
            return status;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
