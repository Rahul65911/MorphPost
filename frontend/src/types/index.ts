// Backend API Types
export type Platform = "linkedin" | "x";
export type Mode = "manual" | "template";
export type ResourceType = "document" | "url" | "image" | "video";
export type ReviewAction = "accept" | "reject" | "edit_and_refine" | "edit_and_publish";

export interface StyleProfile {
    tone: string;
    emojiUsage: string; // Updated to match likely frontend usage camelCase, backend sends camel_case? We need to check backend model.
    // Backend model: basic Pydantic model converts to JSON. Unless configured, it uses snake_case in serialized JSON if not alias_generator set.
    // My backend `StyleProfile` in onboarding.py has `emoji_usage`.
    // So frontend type should probably use `emoji_usage` or I should configure camelCase.
    // Let's stick to what backend returns: snake_case usually unless FastAPI default alias is set. 
    // Actually, Pydantic v2 defaults to keeping snake_case.
    // So `emoji_usage`.
    emoji_usage: string;
    sentence_style: string;
    cta_style: string;
    platform_bias: string[];
}

// Auth Types
export interface SignupRequest {
    username: string;
    email: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
    is_onboarded: boolean;
}

// Resource Types
export interface ResourceInput {
    type: ResourceType;
    source: string;
    name?: string;
    mime_type?: string;
}

export interface ResourceView {
    id: string;
    type: string;
    name?: string;
    source: string;
    created_at: string;
}

// Manual Mode Options
export interface ManualOptions {
    keep_wording: boolean;
    improve_clarity: boolean;
    rewrite_to_match_style: boolean;
    adapt_for_platforms: boolean;
}

// Template Input
export interface TemplateInput {
    goal: string;
    audience: string;
    key_message: string;
    tone?: string;
    call_to_action?: string;
    keywords: string[];
    constraints?: string;
}

// Create Post Request
export interface CreatePostRequest {
    mode: Mode;
    content?: string;
    options?: ManualOptions;
    template?: TemplateInput;
    platforms: Platform[];
    resources: ResourceInput[];
}

// Draft View
export interface DraftView {
    id: string;
    platform: string;
    content: string;
    source: string;
    is_active: boolean;
    created_at: string;
}

// Evaluation View
export interface EvaluationView {
    id: string;
    draft_id: string;
    score: number;
    passed: boolean;
    feedback?: string;
    iteration: number;
    created_at: string;
}

// Platform State View
export interface PlatformStateView {
    platform: string;
    status: string;
    active_draft?: DraftView;
    evaluations: EvaluationView[];
}

// Workflow View
export interface WorkflowView {
    id: string;
    user_id: string;
    status: string;
    title?: string;
    description?: string;
    platforms: PlatformStateView[];
    resources: ResourceView[];
    created_at: string;
    updated_at: string;
    completed_at?: string;
}

export interface WorkflowSummary {
    id: string;
    status: string;
    title?: string;
    created_at: string;
    platform_counts: number;
    platforms: string[];
}

// Review Action Request
export interface ReviewActionRequest {
    workflow_id: string;
    platform: string;
    action: ReviewAction;
    edited_content?: string;
    feedback_instructions?: string;
}

// Publish Request
export interface PublishRequest {
    workflow_id: string;
    platform: string;
    publish_at?: string;
    timezone?: string;
}

// API Response Types
export interface CreateWorkflowResponse {
    workflow_id: string;
}

export interface ReviewActionResponse {
    status: string;
    message: string;
    draft?: {
        id: string;
        content: string;
        platform: string;
        source: string;
        created_at: string;
    };
}

export interface PublishResponse {
    job_id: string;
    status: string;
}

export interface ApiError {
    detail: string;
}

export interface DashboardStats {
    total_posts: number;
    published_posts: number;
    active_drafts: number;
    time_saved_hours: number;
}
