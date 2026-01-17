import { Command } from 'commander';
import chalk from 'chalk';
import { api } from '../api.js';

export function logsCommand(program: Command): void {
    program
        .command('logs <jobId>')
        .description('View logs for a build job')
        .option('--follow', 'Follow log output (not implemented in V1)', false)
        .action(async (jobId: string, options) => {
            try {
                const logs = await api.getJobLogs(jobId);

                if (!logs || logs.trim() === '') {
                    console.log(chalk.dim('No logs available yet.'));
                    return;
                }

                console.log();
                console.log(chalk.bold(`Logs for job: ${jobId}`));
                console.log(chalk.dim('─'.repeat(60)));
                console.log(logs);
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.error(chalk.red(`Job not found or no logs available: ${jobId}`));
                } else {
                    console.error(chalk.red(`Error: ${error.message}`));
                }
                process.exit(1);
            }
        });
}
