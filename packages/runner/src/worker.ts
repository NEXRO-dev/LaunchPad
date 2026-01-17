import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { runPipeline, type PipelineInput } from './pipeline/index.js';
const IORedis = (Redis as any).default || Redis;

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '1', 10);

export const connection = new IORedis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
});

// Helper to update job status in Redis
const JOB_STATUS_PREFIX = 'job:status:';

async function updateJobStatus(
    jobId: string,
    status: 'queued' | 'building' | 'uploading' | 'done' | 'failed',
    extra: { artifactPath?: string; error?: string } = {}
): Promise<void> {
    const now = new Date().toISOString();
    const existing = await connection.get(`${JOB_STATUS_PREFIX}${jobId}`);
    const data = existing ? JSON.parse(existing) : { jobId };

    const updated = {
        ...data,
        status,
        ...(status === 'building' && !data.startedAt ? { startedAt: now } : {}),
        ...(status === 'done' || status === 'failed' ? { finishedAt: now } : {}),
        ...extra,
    };

    await connection.set(
        `${JOB_STATUS_PREFIX}${jobId}`,
        JSON.stringify(updated),
        'EX',
        60 * 60 * 24 * 7 // 7 days TTL
    );
}

export function createWorker(): Worker {
    const worker = new Worker<PipelineInput>(
        'ios-build',
        async (job: Job<PipelineInput>) => {
            const { jobId, projectPath, profile, version, buildNumber, message } = job.data;

            console.log(`\n📱 Starting iOS build job: ${jobId}`);
            console.log(`   Project: ${projectPath}`);
            console.log(`   Version: ${version} (${buildNumber})\n`);

            // Update status to building
            await updateJobStatus(jobId, 'building');

            // Run the pipeline
            const result = await runPipeline({
                jobId,
                projectPath,
                profile,
                version,
                buildNumber,
                message,
            });

            if (result.success) {
                await updateJobStatus(jobId, 'done', { artifactPath: result.artifactPath });
                console.log(`\n✅ Job ${jobId} completed successfully\n`);
                return result;
            } else {
                await updateJobStatus(jobId, 'failed', { error: result.error });
                console.log(`\n❌ Job ${jobId} failed: ${result.error}\n`);
                throw new Error(result.error);
            }
        },
        {
            connection,
            concurrency,
            lockDuration: 60 * 60 * 1000, // 1 hour lock (for long builds)
        }
    );

    worker.on('completed', (job) => {
        console.log(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
        console.error(`Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
        console.error('Worker error:', error);
    });

    return worker;
}
