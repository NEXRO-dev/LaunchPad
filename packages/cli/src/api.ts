import axios, { AxiosInstance } from 'axios';

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

export interface JobStatus {
    jobId: string;
    status: 'queued' | 'building' | 'uploading' | 'done' | 'failed';
    startedAt?: string;
    finishedAt?: string;
    artifactPath?: string;
    error?: string;
}

export class ApiClient {
    private client: AxiosInstance;

    constructor() {
        const baseURL = process.env.LAUNCHPAD_API_URL || 'http://localhost:3000';
        const apiKey = process.env.LAUNCHPAD_API_KEY || '';

        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
        });
    }

    async createiOSJob(data: CreateJobRequest): Promise<CreateJobResponse> {
        const response = await this.client.post<CreateJobResponse>('/jobs/ios', data);
        return response.data;
    }

    async getJobStatus(jobId: string): Promise<JobStatus> {
        const response = await this.client.get<JobStatus>(`/jobs/${jobId}`);
        return response.data;
    }

    async getJobLogs(jobId: string): Promise<string> {
        const response = await this.client.get<string>(`/jobs/${jobId}/logs`, {
            responseType: 'text',
        });
        return response.data;
    }
}

export const api = new ApiClient();
