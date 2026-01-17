import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildApp } from '../src/app.js';

// Cache the instance
let app: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (!app) {
        app = await buildApp();
        await app.ready();
    }

    app.server.emit('request', req, res);
}
