import { config } from 'dotenv';
import { createWorker } from './worker.js';

// Load .env
config();

async function main() {
    console.log('🏃 LaunchPad Runner starting...');
    console.log(`   Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`);
    console.log(`   Concurrency: ${process.env.WORKER_CONCURRENCY || '1'}`);
    console.log('');

    const worker = createWorker();

    console.log('✅ Worker ready, waiting for jobs...\n');

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\n⏳ Shutting down gracefully...');
        await worker.close();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

main().catch((error) => {
    console.error('Failed to start runner:', error);
    process.exit(1);
});
