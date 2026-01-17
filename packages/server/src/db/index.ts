import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/nexro';

// PostgreSQL connection
const client = postgres(DATABASE_URL, {
    ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    max: process.env.NODE_ENV === 'production' ? 10 : 1, // Connection pool size
});

// Drizzle instance
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema.js';
