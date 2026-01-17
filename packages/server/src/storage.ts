import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

const STORAGE_DIR = process.env.STORAGE_DIR || path.join(process.cwd(), 'storage');
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' or 's3'

// S3 config (optional)
const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION;

export interface StorageFile {
    path: string;
    size: number;
    hash: string;
}

/**
 * Save a file to storage
 */
export async function saveFile(
    userId: string,
    projectId: string,
    filename: string,
    content: Buffer
): Promise<StorageFile> {
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
    const relativePath = path.join(userId, projectId, `${hash}-${filename}`);

    if (STORAGE_TYPE === 's3') {
        // TODO: Implement S3 upload
        throw new Error('S3 storage not implemented yet');
    }

    // Local storage
    const fullPath = path.join(STORAGE_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);

    return {
        path: relativePath,
        size: content.length,
        hash,
    };
}

/**
 * Get a file from storage
 */
export async function getFile(relativePath: string): Promise<Buffer> {
    if (STORAGE_TYPE === 's3') {
        // TODO: Implement S3 download
        throw new Error('S3 storage not implemented yet');
    }

    const fullPath = path.join(STORAGE_DIR, relativePath);
    return fs.readFile(fullPath);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(relativePath: string): Promise<void> {
    if (STORAGE_TYPE === 's3') {
        // TODO: Implement S3 delete
        throw new Error('S3 storage not implemented yet');
    }

    const fullPath = path.join(STORAGE_DIR, relativePath);
    await fs.unlink(fullPath).catch(() => { });
}

/**
 * Get the full path for a file (local storage only)
 */
export function getFullPath(relativePath: string): string {
    if (STORAGE_TYPE === 's3') {
        throw new Error('Cannot get full path for S3 storage');
    }
    return path.join(STORAGE_DIR, relativePath);
}
