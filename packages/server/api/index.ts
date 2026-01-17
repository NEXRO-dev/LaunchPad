import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple health check endpoint for Vercel
// Full API runs on a separate server (Railway/Render) or locally
export default async function handler(req: VercelRequest, res: VercelResponse) {
    const path = req.url || '/';

    if (path === '/health' || path === '/') {
        return res.status(200).json({
            status: 'ok',
            service: 'LaunchPad API',
            message: 'For full API, deploy to Railway or run locally'
        });
    }

    return res.status(404).json({ error: 'Not found' });
}
