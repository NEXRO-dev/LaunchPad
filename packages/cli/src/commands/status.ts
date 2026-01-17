import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api.js';

export function statusCommand(program: Command): void {
    program
        .command('status <jobId>')
        .description('Check the status of a build job')
        .action(async (jobId: string) => {
            try {
                const status = await api.getJobStatus(jobId);

                console.log();
                console.log(chalk.bold('Job Status'));
                console.log(chalk.dim('─'.repeat(40)));
                console.log(`  ${chalk.dim('Job ID:')}     ${status.jobId}`);
                console.log(`  ${chalk.dim('Status:')}     ${formatStatus(status.status)}`);

                if (status.startedAt) {
                    console.log(`  ${chalk.dim('Started:')}    ${new Date(status.startedAt).toLocaleString()}`);
                }
                if (status.finishedAt) {
                    console.log(`  ${chalk.dim('Finished:')}   ${new Date(status.finishedAt).toLocaleString()}`);
                }
                if (status.artifactPath) {
                    console.log(`  ${chalk.dim('Artifact:')}   ${status.artifactPath}`);
                }
                if (status.error) {
                    console.log(`  ${chalk.dim('Error:')}      ${chalk.red(status.error)}`);
                }
                console.log();
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.error(chalk.red(`Job not found: ${jobId}`));
                } else {
                    console.error(chalk.red(`Error: ${error.message}`));
                }
                process.exit(1);
            }
        });
}

function formatStatus(status: string): string {
    switch (status) {
        case 'queued':
            return chalk.yellow('⏳ Queued');
        case 'building':
            return chalk.blue('🔨 Building');
        case 'uploading':
            return chalk.magenta('📤 Uploading');
        case 'done':
            return chalk.green('✅ Done');
        case 'failed':
            return chalk.red('❌ Failed');
        default:
            return status;
    }
}
