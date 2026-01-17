import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { db, users, type User, type NewUser } from '../db/index.js';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

interface GitHubTokenResponse {
    access_token: string;
    token_type: string;
    scope: string;
}

interface GitHubUser {
    id: number;
    login: string;
    name: string;
    email: string;
    avatar_url: string;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {

    // GitHub OAuth: Get authorization URL
    fastify.get('/auth/github', async (request, reply) => {
        if (!GITHUB_CLIENT_ID) {
            return reply.code(500).send({ error: 'GitHub OAuth not configured' });
        }

        const redirectUri = `${APP_URL}/auth/github/callback`;
        const scope = 'read:user user:email';

        const authUrl = `https://github.com/login/oauth/authorize?` +
            `client_id=${GITHUB_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `scope=${encodeURIComponent(scope)}`;

        return reply.redirect(authUrl);
    });

    // GitHub OAuth: Callback
    fastify.get<{
        Querystring: { code?: string; error?: string };
    }>('/auth/github/callback', async (request, reply) => {
        const { code, error } = request.query;

        if (error || !code) {
            return reply.code(400).send({ error: error || 'No authorization code provided' });
        }

        try {
            // Exchange code for access token
            const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    client_id: GITHUB_CLIENT_ID,
                    client_secret: GITHUB_CLIENT_SECRET,
                    code,
                }),
            });

            const tokenData = await tokenResponse.json() as GitHubTokenResponse;

            if (!tokenData.access_token) {
                return reply.code(400).send({ error: 'Failed to get access token' });
            }

            // Get user info from GitHub
            const userResponse = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Accept': 'application/json',
                },
            });

            const githubUser = await userResponse.json() as GitHubUser;

            // Get user's email if not public
            let email = githubUser.email;
            if (!email) {
                const emailsResponse = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        'Authorization': `Bearer ${tokenData.access_token}`,
                        'Accept': 'application/json',
                    },
                });
                const emails = await emailsResponse.json() as Array<{ email: string; primary: boolean }>;
                const primaryEmail = emails.find(e => e.primary);
                email = primaryEmail?.email || '';
            }

            // Find or create user
            let user = await db.query.users.findFirst({
                where: eq(users.providerId, String(githubUser.id)),
            });

            if (!user) {
                // Create new user
                const newUser: NewUser = {
                    email,
                    name: githubUser.name || githubUser.login,
                    avatarUrl: githubUser.avatar_url,
                    provider: 'github',
                    providerId: String(githubUser.id),
                };

                const [created] = await db.insert(users).values(newUser).returning();
                user = created;
            }

            // Generate JWT token
            const token = fastify.jwt.sign({
                userId: user.id,
                email: user.email,
            }, { expiresIn: '7d' });

            // Set cookie and redirect
            reply.setCookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: '/',
            });

            // Redirect to dashboard (or return JSON for API clients)
            if (request.headers.accept?.includes('application/json')) {
                return { token, user };
            }

            return reply.redirect('/dashboard');

        } catch (err: any) {
            fastify.log.error(err);
            return reply.code(500).send({ error: 'Authentication failed' });
        }
    });

    // Get current user
    fastify.get('/auth/me', {
        preHandler: [fastify.authenticate],
    }, async (request, reply) => {
        const userId = (request.user as any).userId;

        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (!user) {
            return reply.code(404).send({ error: 'User not found' });
        }

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
        };
    });

    // Logout
    fastify.post('/auth/logout', async (request, reply) => {
        reply.clearCookie('token', { path: '/' });
        return { success: true };
    });
}
