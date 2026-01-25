# API Reference

Complete API documentation for MorphPost Backend.

**Base URL:** `http://localhost:8000/api/v1`

**Authentication:** Bearer token (JWT) required for all endpoints except auth endpoints.

---

## Authentication

### Sign Up

**Endpoint:** `POST /auth/signup`

**Description:** Create a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string (email format)",
  "password": "string (min 8 characters)"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "string (JWT token)",
  "token_type": "bearer"
}
```

**Errors:**
- `400 Bad Request` - Invalid input or user already exists

---

### Login

**Endpoint:** `POST /auth/login`

**Description:** Authenticate and receive access token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access_token": "string (JWT token)",
  "token_type": "bearer"
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials

---

## Workflow Management

### Create Workflow

**Endpoint:** `POST /create`

**Description:** Start a new content creation workflow. The workflow will generate drafts for all specified platforms in parallel.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "mode": "manual | template",
  "platforms": ["linkedin", "x", "blog"],
  "source_content": "string (required for manual mode)",
  "template_input": {
    "template_id": "string",
    "variables": {}
  },
  "resources": [
    {
      "type": "style_sample | reference | image",
      "content": "string",
      "metadata": {}
    }
  ],
  "manual_options": {
    "tone": "professional | casual | technical",
    "length": "short | medium | long",
    "include_hashtags": true,
    "include_call_to_action": true
  }
}
```

**Field Descriptions:**

- `mode`: Content creation mode
  - `manual`: User provides source content to adapt
  - `template`: Use predefined template with variables

- `platforms`: Array of target platforms
  - `linkedin`: LinkedIn post
  - `x`: X/Twitter post
  - `blog`: Blog article

- `source_content`: Original content to adapt (required for manual mode)

- `template_input`: Template configuration (required for template mode)

- `resources`: Additional context for AI generation
  - `style_sample`: Examples of user's writing style
  - `reference`: Reference materials
  - `image`: Image descriptions/URLs

- `manual_options`: Generation preferences (optional)

**Response:** `201 Created`
```json
{
  "workflow_id": "uuid"
}
```

**Errors:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid token

---

### Get Workflow Status

**Endpoint:** `GET /workflow/{workflow_id}`

**Description:** Retrieve current workflow status, platform states, and generated drafts.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `workflow_id`: UUID of the workflow

**Response:** `200 OK`
```json
{
  "workflow_id": "uuid",
  "status": "running | awaiting_review | completed | failed",
  "created_at": "ISO 8601 timestamp",
  "platforms": [
    {
      "platform": "linkedin | x | blog",
      "status": "generating | evaluating | awaiting_review | accepted | rejected",
      "active_draft": {
        "id": "uuid",
        "content": "string",
        "source": "ai | human",
        "created_at": "ISO 8601 timestamp"
      }
    }
  ]
}
```

**Platform Status Values:**
- `generating`: AI is creating content
- `evaluating`: AI is evaluating the draft
- `awaiting_review`: Draft ready for human review
- `accepted`: Draft approved by user
- `rejected`: Draft rejected, will regenerate

**Errors:**
- `404 Not Found` - Workflow not found or doesn't belong to user
- `401 Unauthorized` - Missing or invalid token

---

## Draft Review

### Accept Draft

**Endpoint:** `POST /review/accept`

**Description:** Accept an AI-generated draft for a specific platform.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "workflow_id": "uuid",
  "platform": "linkedin | x | blog"
}
```

**Response:** `200 OK`
```json
{
  "message": "Draft accepted",
  "platform": "linkedin",
  "status": "accepted"
}
```

**Errors:**
- `404 Not Found` - Workflow or platform not found
- `400 Bad Request` - Platform not in reviewable state

---

### Reject Draft

**Endpoint:** `POST /review/reject`

**Description:** Reject a draft and trigger regeneration with feedback.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "workflow_id": "uuid",
  "platform": "linkedin | x | blog",
  "feedback": "string (optional - guidance for regeneration)"
}
```

**Response:** `200 OK`
```json
{
  "message": "Draft rejected, regenerating...",
  "platform": "linkedin",
  "status": "regenerating"
}
```

**Notes:**
- Feedback is optional but recommended for better regeneration
- System will automatically regenerate up to `max_iterations` times
- If max iterations reached, workflow will pause for review

**Errors:**
- `404 Not Found` - Workflow or platform not found
- `400 Bad Request` - Platform not in reviewable state

---

## Publishing

### Publish Content

**Endpoint:** `POST /publish`

**Description:** Publish accepted drafts to target platforms.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "workflow_id": "uuid",
  "platforms": ["linkedin", "x"],
  "schedule_time": "ISO 8601 timestamp | null"
}
```

**Field Descriptions:**
- `platforms`: Array of platforms to publish to (must be accepted)
- `schedule_time`: 
  - `null`: Publish immediately
  - ISO timestamp: Schedule for future publishing

**Response:** `200 OK`
```json
{
  "message": "Publishing initiated",
  "jobs": [
    {
      "platform": "linkedin",
      "status": "queued | scheduled",
      "scheduled_for": "ISO 8601 timestamp | null"
    }
  ]
}
```

**Errors:**
- `404 Not Found` - Workflow not found
- `400 Bad Request` - Platform not accepted or already published

---

## Workflow History

### Get User Workflows

**Endpoint:** `GET /history`

**Description:** Retrieve user's workflow history with pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (optional)

**Response:** `200 OK`
```json
{
  "total": 42,
  "page": 1,
  "limit": 20,
  "workflows": [
    {
      "workflow_id": "uuid",
      "status": "completed",
      "created_at": "ISO 8601 timestamp",
      "platforms": ["linkedin", "x"],
      "mode": "manual"
    }
  ]
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Error message describing the issue"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "field_name"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

Currently not implemented. Future versions will include:
- 100 requests per minute per user
- 1000 requests per hour per user

---

## Webhooks (Future)

Future versions will support webhooks for:
- Workflow completion
- Draft ready for review
- Publishing success/failure

---

## Example Workflow

### 1. Create Account
```bash
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepass123"
  }'
```

### 2. Create Workflow
```bash
curl -X POST http://localhost:8000/api/v1/create \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "manual",
    "platforms": ["linkedin", "x"],
    "source_content": "AI is transforming software development...",
    "resources": []
  }'
```

### 3. Check Status
```bash
curl -X GET http://localhost:8000/api/v1/workflow/<workflow_id> \
  -H "Authorization: Bearer <token>"
```

### 4. Accept Draft
```bash
curl -X POST http://localhost:8000/api/v1/review/accept \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "<workflow_id>",
    "platform": "linkedin"
  }'
```

### 5. Publish
```bash
curl -X POST http://localhost:8000/api/v1/publish \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "<workflow_id>",
    "platforms": ["linkedin"],
    "schedule_time": null
  }'
```
