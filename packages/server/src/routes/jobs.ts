import type { FastifyInstance } from 'fastify';
import { nanoid } from 'nanoid';
import * as fs from 'fs/promises';
import * as path from 'path';
import { iosQueue, setJobStatus, getJobStatus } from '../queue.js';
import type { CreateJobRequest, CreateJobResponse, JobData } from '../types.js';

const LOGS_DIR = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

export async function jobRoutes(fastify: FastifyInstance): Promise<void> {
    // All job routes require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // POST /jobs/ios - Create iOS build job
    fastify.post<{
        Body: CreateJobRequest;
        Reply: CreateJobResponse;
    }>('/jobs/ios', async (request, reply) => {
        const { projectPath, profile, version, buildNumber, message } = request.body;

        // Validate required fields
        if (!projectPath || !version || !buildNumber) {
            return reply.code(400).send({
                error: 'Missing required fields: projectPath, version, buildNumber',
            } as any);
        }

        const jobId = nanoid(12);

        const jobData: JobData = {
            jobId,
            projectPath,
            profile: profile || 'production',
            version,
            buildNumber,
            message,
        };

        // Add to queue
        await iosQueue.add('build', jobData, {
            jobId,
        });

        // Set initial status
        await setJobStatus({
            jobId,
            status: 'queued',
        });

        fastify.log.info(`Created iOS job: ${jobId}`);

        return { jobId };
    });

    // GET /jobs/:jobId - Get job status
    fastify.get<{
        Params: { jobId: string };
    }>('/jobs/:jobId', async (request, reply) => {
        const { jobId } = request.params;

        const status = await getJobStatus(jobId);
        if (!status) {
            return reply.code(404).send({ error: 'Job not found' } as any);
        }

        return status;
    });

    // GET /jobs/:jobId/logs - Get job logs
    fastify.get<{
        Params: { jobId: string };
    }>('/jobs/:jobId/logs', async (request, reply) => {
        const { jobId } = request.params;

        const logPath = path.join(LOGS_DIR, `${jobId}.log`);

        try {
            const logs = await fs.readFile(logPath, 'utf-8');
            reply.type('text/plain').send(logs);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return reply.code(404).send({ error: 'Logs not found' } as any);
            }
            throw error;
        }
    });
}
