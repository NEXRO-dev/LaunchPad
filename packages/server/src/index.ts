import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { jobRoutes } from './routes/jobs.js';
import { authRoutes } from './routes/auth.js';
import { credentialRoutes } from './routes/credentials.js';
import { projectRoutes } from './routes/projects.js';

// Load .env
config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const JWT_SECRET = process.env.JWT_SECRET || 'launchpad-dev-secret-change-in-production';

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

async function main() {
    const fastify = Fastify({
        logger: {
            level: 'info',
            transport: {
                target: 'pino-pretty',
                options: {
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname',
                },
            },
        },
    });

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

    // Register routes
    await fastify.register(authRoutes);
    await fastify.register(credentialRoutes);
    await fastify.register(projectRoutes);
    await fastify.register(jobRoutes);

    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`\n🚀 LaunchPad Server running on http://${HOST}:${PORT}\n`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

main();
