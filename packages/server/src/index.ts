import { config } from 'dotenv';
import { buildApp } from './app.js';

// Load .env
config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
    const fastify = await buildApp();

    try {
        await fastify.listen({ port: PORT, host: HOST });
        console.log(`\n🚀 LaunchPad Server running on http://${HOST}:${PORT}\n`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

main();
