import type { VercelRequest, VercelResponse } from '@vercel/node';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { jobRoutes } from '../dist/routes/jobs.js';
import { authRoutes } from '../dist/routes/auth.js';
import { credentialRoutes } from '../dist/routes/credentials.js';
import { projectRoutes } from '../dist/routes/projects.js';

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

let app: any;

async function buildApp() {
    const fastify = Fastify({ logger: false });
    const JWT_SECRET = process.env.JWT_SECRET || 'launchpad-dev-secret';

    await fastify.register(cors, { origin: true, credentials: true });
    await fastify.register(cookie);
    await fastify.register(multipart, { limits: { fileSize: 500 * 1024 * 1024 } });
    await fastify.register(jwt, {
        secret: JWT_SECRET,
        cookie: { cookieName: 'token', signed: false },
    });

    fastify.decorate('authenticate', async function (request: any, reply: any) {
        try {
            await request.jwtVerify();
        } catch (err) {
            const apiKey = request.headers['x-api-key'];
            const expectedKey = process.env.API_KEY;
            if (apiKey && expectedKey && apiKey === expectedKey) {
                request.user = { userId: 'system', email: 'system@launchpad' };
                return;
            }
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });

    fastify.get('/', async () => ({ status: 'ok', service: 'LaunchPad API' }));
    fastify.get('/health', async () => ({ status: 'ok' }));

    await fastify.register(authRoutes);
    await fastify.register(credentialRoutes);
    await fastify.register(projectRoutes);
    await fastify.register(jobRoutes);

    return fastify;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!app) {
        app = await buildApp();
        await app.ready();
    }

    app.server.emit('request', req, res);
}
