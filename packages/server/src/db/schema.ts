import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

// ユーザーテーブル
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    name: varchar('name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    provider: varchar('provider', { length: 50 }), // github, google
    providerId: varchar('provider_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow(),
});

// Apple 認証情報テーブル（暗号化）
export const credentials = pgTable('credentials', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    teamId: varchar('team_id', { length: 20 }).notNull(),
    ascKeyId: varchar('asc_key_id', { length: 20 }).notNull(),
    ascIssuerId: uuid('asc_issuer_id').notNull(),
    ascKeyEncrypted: text('asc_key_encrypted').notNull(), // 暗号化された .p8 内容
    createdAt: timestamp('created_at').defaultNow(),
});

// プロジェクトテーブル
export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    bundleId: varchar('bundle_id', { length: 255 }).notNull(),
    storagePath: text('storage_path'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

// ビルドジョブテーブル
export const jobs = pgTable('jobs', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id).notNull(),
    projectId: uuid('project_id').references(() => projects.id),
    credentialId: uuid('credential_id').references(() => credentials.id),
    status: varchar('status', { length: 50 }).default('queued').notNull(),
    version: varchar('version', { length: 20 }),
    buildNumber: varchar('build_number', { length: 20 }),
    message: text('message'),
    artifactPath: text('artifact_path'),
    error: text('error'),
    startedAt: timestamp('started_at'),
    finishedAt: timestamp('finished_at'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
