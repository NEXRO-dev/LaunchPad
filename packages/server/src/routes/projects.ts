import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db, projects, type NewProject } from '../db/index.js';

export async function projectRoutes(fastify: FastifyInstance): Promise<void> {
    // All routes require authentication
    fastify.addHook('preHandler', fastify.authenticate);

    // Create project
    fastify.post<{
        Body: {
            name: string;
            bundleId: string;
        };
    }>('/projects', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { name, bundleId } = request.body;

        if (!name || !bundleId) {
            return reply.code(400).send({ error: 'Name and bundleId are required' });
        }

        const newProject: NewProject = {
            userId,
            name,
            bundleId,
        };

        const [created] = await db.insert(projects).values(newProject).returning();

        return created;
    });

    // List projects
    fastify.get('/projects', async (request, reply) => {
        const userId = (request.user as any).userId;

        const userProjects = await db.query.projects.findMany({
            where: eq(projects.userId, userId),
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        });

        return userProjects;
    });

    // Get single project
    fastify.get<{
        Params: { id: string };
    }>('/projects/:id', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { id } = request.params;

        const project = await db.query.projects.findFirst({
            where: and(eq(projects.id, id), eq(projects.userId, userId)),
        });

        if (!project) {
            return reply.code(404).send({ error: 'Project not found' });
        }

        return project;
    });

    // Update project
    fastify.put<{
        Params: { id: string };
        Body: {
            name?: string;
            bundleId?: string;
        };
    }>('/projects/:id', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { id } = request.params;
        const { name, bundleId } = request.body;

        const project = await db.query.projects.findFirst({
            where: and(eq(projects.id, id), eq(projects.userId, userId)),
        });

        if (!project) {
            return reply.code(404).send({ error: 'Project not found' });
        }

        const [updated] = await db
            .update(projects)
            .set({
                ...(name && { name }),
                ...(bundleId && { bundleId }),
                updatedAt: new Date(),
            })
            .where(eq(projects.id, id))
            .returning();

        return updated;
    });

    // Delete project
    fastify.delete<{
        Params: { id: string };
    }>('/projects/:id', async (request, reply) => {
        const userId = (request.user as any).userId;
        const { id } = request.params;

        const project = await db.query.projects.findFirst({
            where: and(eq(projects.id, id), eq(projects.userId, userId)),
        });

        if (!project) {
            return reply.code(404).send({ error: 'Project not found' });
        }

        await db.delete(projects).where(eq(projects.id, id));

        return { success: true };
    });
}
