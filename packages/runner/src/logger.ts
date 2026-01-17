import * as fs from 'fs/promises';
import * as path from 'path';

const LOGS_DIR = process.env.LOGS_DIR || path.join(process.cwd(), '../server/logs');

export class Logger {
    private jobId: string;
    private logPath: string;
    private buffer: string[] = [];
    private flushInterval: NodeJS.Timeout | null = null;

    constructor(jobId: string) {
        this.jobId = jobId;
        this.logPath = path.join(LOGS_DIR, `${jobId}.log`);
    }

    async init(): Promise<void> {
        await fs.mkdir(path.dirname(this.logPath), { recursive: true });
        await fs.writeFile(this.logPath, `=== LaunchPad Build Log: ${this.jobId} ===\n`);
        await fs.appendFile(this.logPath, `Started at: ${new Date().toISOString()}\n\n`);

        // Flush buffer every 500ms
        this.flushInterval = setInterval(() => this.flush(), 500);
    }

    async log(message: string): Promise<void> {
        const timestamp = new Date().toISOString();
        const line = `[${timestamp}] ${message}\n`;
        this.buffer.push(line);
        console.log(message);
    }

    async step(step: string): Promise<void> {
        const separator = '─'.repeat(50);
        await this.log(`\n${separator}`);
        await this.log(`▶ ${step}`);
        await this.log(separator);
    }

    async command(cmd: string): Promise<void> {
        await this.log(`$ ${cmd}`);
    }

    async stdout(data: string): Promise<void> {
        this.buffer.push(data);
        process.stdout.write(data);
    }

    async stderr(data: string): Promise<void> {
        this.buffer.push(data);
        process.stderr.write(data);
    }

    async error(message: string): Promise<void> {
        await this.log(`❌ ERROR: ${message}`);
    }

    async success(message: string): Promise<void> {
        await this.log(`✅ ${message}`);
    }

    private async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const content = this.buffer.join('');
        this.buffer = [];

        try {
            await fs.appendFile(this.logPath, content);
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async close(): Promise<void> {
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
        }
        await this.flush();
        await fs.appendFile(this.logPath, `\nFinished at: ${new Date().toISOString()}\n`);
    }
}
