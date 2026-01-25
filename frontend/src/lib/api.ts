import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type {
    SignupRequest,
    LoginRequest,
    User,
    TokenResponse,
    CreatePostRequest,
    CreateWorkflowResponse,
    WorkflowView,
    ReviewActionRequest,
    ReviewActionResponse,
    PublishRequest,
    PublishResponse,
    WorkflowSummary,
    ApiError,
    DashboardStats,
    StyleProfile, // You might need to define this type in types/index.ts or let it infer
} from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add auth token
        this.client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const token = this.getToken();
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError<ApiError>) => {
                if (error.response?.status === 401) {
                    // Token expired or invalid
                    this.clearToken();
                    window.location.href = '/auth';
                }
                return Promise.reject(error);
            }
        );
    }

    // Token management
    private getToken(): string | null {
        return localStorage.getItem('access_token');
    }

    setToken(token: string): void {
        localStorage.setItem('access_token', token);
    }

    clearToken(): void {
        localStorage.removeItem('access_token');
    }

    // Auth endpoints
    async signup(data: SignupRequest): Promise<TokenResponse> {
        const response = await this.client.post<TokenResponse>('/api/v1/auth/signup', data);
        return response.data;
    }

    async login(data: LoginRequest): Promise<TokenResponse> {
        const response = await this.client.post<TokenResponse>('/api/v1/auth/login', data);
        return response.data;
    }

    async googleLogin(token: string): Promise<TokenResponse> {
        const response = await this.client.post<TokenResponse>('/api/v1/auth/google', { token });
        return response.data;
    }

    async getProfile(): Promise<User> {
        const response = await this.client.get<User>('/api/v1/auth/me');
        return response.data;
    }

    // Workflow endpoints
    async createWorkflow(data: CreatePostRequest): Promise<CreateWorkflowResponse> {
        const response = await this.client.post<CreateWorkflowResponse>('/api/v1/create', data);
        return response.data;
    }

    async getDashboardStats(): Promise<DashboardStats> {
        const response = await this.client.get<DashboardStats>('/api/v1/history/stats');
        return response.data;
    }

    async getWorkflows(skip = 0, limit = 20): Promise<WorkflowSummary[]> {
        const response = await this.client.get<WorkflowSummary[]>('/api/v1/history/', {
            params: { skip, limit }
        });
        return response.data;
    }

    async getWorkflow(workflowId: string): Promise<WorkflowView> {
        const response = await this.client.get<WorkflowView>(`/api/v1/workflow/${workflowId}`);
        return response.data;
    }

    // Review endpoints
    async submitReviewAction(data: ReviewActionRequest): Promise<ReviewActionResponse> {
        const response = await this.client.post<ReviewActionResponse>('/api/v1/review/action', data);
        return response.data;
    }

    // Publish endpoints
    async publishOrSchedule(data: PublishRequest): Promise<PublishResponse> {
        const response = await this.client.post<PublishResponse>('/api/v1/publish/schedule', data);
        return response.data;
    }

    // Onboarding endpoints
    async uploadSource(file: File): Promise<{ status: string; message: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const response = await this.client.post('/api/v1/onboarding/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async submitUrl(url: string): Promise<{ status: string; message: string }> {
        const response = await this.client.post('/api/v1/onboarding/url', null, {
            params: { url: url }
        });
        return response.data;
    }

    async submitText(text: string): Promise<{ status: string; message: string }> {
        const formData = new FormData();
        formData.append('text', text);
        const response = await this.client.post('/api/v1/onboarding/text', formData, {
            headers: {
                'Content-Type': undefined, // Let browser set multipart/form-data with boundary
            }
        });
        return response.data;
    }

    async analyzeStyle(): Promise<{ profile: any; summary: string }> {
        const response = await this.client.post('/api/v1/onboarding/analyze');
        return response.data;
    }

    async connectTwitter(): Promise<{ url: string }> {
        const response = await this.client.get('/api/v1/onboarding/connect/twitter');
        return response.data;
    }

    async connectLinkedIn(): Promise<{ url: string }> {
        const response = await this.client.get('/api/v1/onboarding/connect/linkedin');
        return response.data;
    }

    // Helper to extract error message
    getErrorMessage(error: unknown): string {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<ApiError>;
            return axiosError.response?.data?.detail || axiosError.message || 'An error occurred';
        }
        if (error instanceof Error) {
            return error.message;
        }
        return 'An unknown error occurred';
    }
}

export const api = new ApiClient();
