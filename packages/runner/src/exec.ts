import { execa, type Options as ExecaOptions } from 'execa';
import { Logger } from './logger.js';

export interface ExecResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export async function exec(
    command: string,
    args: string[],
    logger: Logger,
    options: ExecaOptions = {}
): Promise<ExecResult> {
    const fullCommand = `${command} ${args.join(' ')}`;
    await logger.command(fullCommand);

    const proc = execa(command, args, {
        ...options,
        reject: false,
        all: true,
    });

    // Stream stdout/stderr to logger
    proc.stdout?.on('data', (data) => {
        logger.stdout(data.toString());
    });

    proc.stderr?.on('data', (data) => {
        logger.stderr(data.toString());
    });

    const result = await proc;

    return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.exitCode ?? 1,
    };
}

export async function execOrThrow(
    command: string,
    args: string[],
    logger: Logger,
    options: ExecaOptions = {}
): Promise<ExecResult> {
    const result = await exec(command, args, logger, options);

    if (result.exitCode !== 0) {
        throw new Error(`Command failed with exit code ${result.exitCode}: ${command} ${args.join(' ')}`);
    }

    return result;
}
