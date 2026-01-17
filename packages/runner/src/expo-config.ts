import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExpoConfig {
    name: string;
    slug: string;
    version?: string;
    ios?: {
        bundleIdentifier?: string;
        buildNumber?: string;
    };
    android?: {
        package?: string;
    };
}

/**
 * Read Expo app configuration from app.json or app.config.js
 */
export async function readExpoConfig(projectPath: string): Promise<ExpoConfig> {
    // Try app.json first
    const appJsonPath = path.join(projectPath, 'app.json');
    try {
        const content = await fs.readFile(appJsonPath, 'utf-8');
        const json = JSON.parse(content);
        // app.json wraps config in "expo" key
        return json.expo || json;
    } catch {
        // Try app.config.js
        const appConfigPath = path.join(projectPath, 'app.config.js');
        try {
            // Dynamic import for JS config
            const config = await import(appConfigPath);
            return config.default || config;
        } catch {
            throw new Error(`Could not find app.json or app.config.js in ${projectPath}`);
        }
    }
}

/**
 * Get iOS Bundle Identifier from Expo config
 */
export async function getBundleIdentifier(projectPath: string): Promise<string> {
    const config = await readExpoConfig(projectPath);

    const bundleId = config.ios?.bundleIdentifier;
    if (!bundleId) {
        throw new Error(
            'No ios.bundleIdentifier found in app.json. ' +
            'Please add it to your Expo config: { "expo": { "ios": { "bundleIdentifier": "com.example.app" } } }'
        );
    }

    return bundleId;
}

/**
 * Get app name from Expo config
 */
export async function getAppName(projectPath: string): Promise<string> {
    const config = await readExpoConfig(projectPath);
    return config.name || config.slug || 'App';
}
