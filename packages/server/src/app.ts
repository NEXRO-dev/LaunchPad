import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { jobRoutes } from './routes/jobs.js';
import { authRoutes } from './routes/auth.js';
import { credentialRoutes } from './routes/credentials.js';
import { projectRoutes } from './routes/projects.js';

// Extend Fastify types
declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: any, reply: any) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { userId: string; email: string };
        user: { userId: string; email: string };
    }
}

export async function buildApp() {
    const fastify = Fastify({
        logger: {
            level: 'info',
            transport: process.env.NODE_ENV !== 'production' ? {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            } : undefined, // No pretty printing in production for performance
        },
    });

    const JWT_SECRET = process.env.JWT_SECRET || 'launchpad-dev-secret-change-in-production';

    // CORS
    await fastify.register(cors, {
        origin: true,
        credentials: true,
    });

    // Cookie support
    await fastify.register(cookie);

    // Multipart/form-data for file uploads
    await fastify.register(multipart, {
        limits: {
            fileSize: 500 * 1024 * 1024, // 500MB max
        },
    });

    // JWT
    await fastify.register(jwt, {
        secret: JWT_SECRET,
        cookie: {
            cookieName: 'token',
            signed: false,
        },
    });

    // Authentication decorator
    fastify.decorate('authenticate', async function (request: any, reply: any) {
        try {
            await request.jwtVerify();
        } catch (err) {
            // Check for x-api-key header (for CLI/backward compatibility)
            const apiKey = request.headers['x-api-key'];
            const expectedKey = process.env.API_KEY;
            if (apiKey && expectedKey && apiKey === expectedKey) {
                // API key auth - set a system user
                request.user = { userId: 'system', email: 'system@launchpad' };
                return;
            }
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });

    // Health check (no auth)
    fastify.get('/health', async () => {
        return { status: 'ok' };
    });

    // Root path for Vercel
    fastify.get('/', async () => {
        return { status: 'ok', service: 'LaunchPad API' };
    });

    // Register routes
    await fastify.register(authRoutes);
    await fastify.register(credentialRoutes);
    await fastify.register(projectRoutes);
    await fastify.register(jobRoutes);

    return fastify;
}
