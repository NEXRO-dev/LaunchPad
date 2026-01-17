export interface JobData {
    jobId: string;
    projectPath: string;
    profile: string;
    version: string;
    buildNumber: string;
    message?: string;
}

export interface JobStatus {
    jobId: string;
    status: 'queued' | 'building' | 'uploading' | 'done' | 'failed';
    startedAt?: string;
    finishedAt?: string;
    artifactPath?: string;
    error?: string;
}

export interface CreateJobRequest {
    projectPath: string;
    profile?: string;
    version: string;
    buildNumber: string;
    message?: string;
}

export interface CreateJobResponse {
    jobId: string;
}
