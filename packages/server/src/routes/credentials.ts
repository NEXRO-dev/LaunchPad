import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, credentials, users, type NewCredential } from '../db/index.js';
import { encrypt, decrypt } from '../crypto.js';

export async function credentialRoutes(fastify: FastifyInstance): Promise<void> {

    // All routes require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // Create/update Apple credentials
    fastify.post<{
        Body: {
            name: string;
            teamId: string;
            ascKeyId: string;
            ascIssuerId: string;
            ascKeyContent: string; // .p8 file content
        };
    }>('/credentials/apple', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { name, teamId, ascKeyId, ascIssuerId, ascKeyContent } = request.body;

        // Validate required fields
        if (!name || !teamId || !ascKeyId || !ascIssuerId || !ascKeyContent) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        // Encrypt the API key content
        const encryptedKey = encrypt(ascKeyContent);

        // Create credential
        const newCredential: NewCredential = {
            userId,
            name,
            teamId,
            ascKeyId,
            ascIssuerId,
            ascKeyEncrypted: encryptedKey,
        };

        const [created] = await db.insert(credentials).values(newCredential).returning();

        return {
            id: created.id,
            name: created.name,
            teamId: created.teamId,
            ascKeyId: created.ascKeyId,
            createdAt: created.createdAt,
        };
    });

    // List credentials (without encrypted data)
    fastify.get('/credentials', async (request, reply) => {
        const userId = (request.user as any).userId;

        const userCredentials = await db.query.credentials.findMany({
            where: eq(credentials.userId, userId),
            columns: {
                id: true,
                name: true,
                teamId: true,
                ascKeyId: true,
                createdAt: true,
            },
        });

        return userCredentials;
    });

    // Get single credential
    fastify.get<{
        Params: { id: string };
    }>('/credentials/:id', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { id } = request.params;

        const credential = await db.query.credentials.findFirst({
            where: eq(credentials.id, id),
        });

        if (!credential || credential.userId !== userId) {
            return reply.code(404).send({ error: 'Credential not found' });
        }

        return {
            id: credential.id,
            name: credential.name,
            teamId: credential.teamId,
            ascKeyId: credential.ascKeyId,
            ascIssuerId: credential.ascIssuerId,
            createdAt: credential.createdAt,
        };
    });

    // Delete credential
    fastify.delete<{
        Params: { id: string };
    }>('/credentials/:id', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { id } = request.params;

        const credential = await db.query.credentials.findFirst({
            where: eq(credentials.id, id),
        });

        if (!credential || credential.userId !== userId) {
            return reply.code(404).send({ error: 'Credential not found' });
        }

        await db.delete(credentials).where(eq(credentials.id, id));

        return { success: true };
    });
}

/**
 * Get decrypted credential for use in build pipeline
 * (Internal use only, not exposed via API)
 */
export async function getDecryptedCredential(credentialId: string) {
    const credential = await db.query.credentials.findFirst({
        where: eq(credentials.id, credentialId),
    });

    if (!credential) {
        throw new Error('Credential not found');
    }

    return {
        ...credential,
        ascKeyContent: decrypt(credential.ascKeyEncrypted),
    };
}
