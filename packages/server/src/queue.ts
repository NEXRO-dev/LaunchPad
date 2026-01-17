import { Queue } from 'bullmq';
import Redis from 'ioredis';
import type { JobData, JobStatus } from './types.js';
const IORedis = (Redis as any).default || Redis;

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

export const connection = new IORedis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null,
});

export const iosQueue = new Queue<JobData>('ios-build', {
    connection,
    defaultJobOptions: {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
    },
});

// Job status storage (using Redis for V1)
const JOB_STATUS_PREFIX = 'job:status:';

export async function setJobStatus(status: JobStatus): Promise<void> {
    await connection.set(
        `${JOB_STATUS_PREFIX}${status.jobId}`,
        JSON.stringify(status),
        'EX',
        60 * 60 * 24 * 7 // 7 days TTL
    );
}

export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
    const data = await connection.get(`${JOB_STATUS_PREFIX}${jobId}`);
    if (!data) return null;
    return JSON.parse(data) as JobStatus;
}
