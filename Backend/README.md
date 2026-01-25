# MorphPost Backend

AI-powered multi-platform content creation and publishing system built with **FastAPI** and **LangGraph**.

## 🏗️ Architecture Overview

MorphPost uses a **LangGraph-based workflow engine** to orchestrate AI content generation, evaluation, and publishing across multiple platforms (LinkedIn, X/Twitter, Blog).

### Core Components

```mermaid
graph TB
    Client[Frontend Client] --> API[FastAPI REST API]
    API --> Services[Business Services]
    Services --> LangGraph[LangGraph Workflow Engine]
    Services --> DB[(PostgreSQL)]
    LangGraph --> AI[OpenAI GPT-4]
    LangGraph --> Search[Tavily Search]
    LangGraph --> Checkpointer[(LangGraph Checkpointer)]
    Services --> Workers[Background Workers]
    Workers --> Publishers[Platform Publishers]
    Publishers --> Platforms[LinkedIn/X/Blog APIs]
```

### Key Technologies

- **FastAPI** - Modern async web framework
- **LangGraph** - Stateful AI workflow orchestration with checkpointing
- **PostgreSQL** - Primary database + LangGraph state persistence
- **SQLAlchemy 2.0** - Async ORM
- **OpenAI GPT-4** - Content generation and evaluation
- **Dramatiq + Redis** - Background job processing
- **Alembic** - Database migrations

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── api/v1/              # REST API endpoints
│   │   ├── auth.py          # Authentication (login/signup)
│   │   ├── create.py        # Start new workflows
│   │   ├── workflow.py      # Get workflow status
│   │   ├── review.py        # Accept/reject drafts
│   │   └── publish.py       # Publish approved content
│   │
│   ├── langgraph/           # LangGraph workflow engine
│   │   ├── graph.py         # Main workflow graph (fan-out/fan-in)
│   │   ├── platform_subgraph.py  # Per-platform processing
│   │   ├── state.py         # State definitions
│   │   ├── runner.py        # Graph execution runner
│   │   ├── nodes/           # Workflow nodes
│   │   │   ├── generate.py  # AI content generation
│   │   │   ├── evaluate.py  # AI evaluation
│   │   │   ├── regenerate.py # Regeneration with feedback
│   │   │   ├── hitl.py      # Human-in-the-loop pause
│   │   │   └── route.py     # Conditional routing logic
│   │   ├── ai/              # AI integrations
│   │   │   ├── generator.py # OpenAI content generation
│   │   │   ├── evaluator.py # OpenAI evaluation
│   │   │   └── content_builder.py # Context preparation
│   │   └── persistence/     # State persistence
│   │       └── draft_persister.py
│   │
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── user.py          # User accounts
│   │   ├── workflow.py      # Workflow metadata
│   │   ├── platform_state.py # Platform-specific state
│   │   ├── draft.py         # Generated drafts
│   │   ├── evaluation.py    # Evaluation results
│   │   ├── resource.py      # User resources (style samples)
│   │   └── publishing_job.py # Publishing jobs
│   │
│   ├── services/            # Business logic layer
│   │   ├── workflow_service.py    # Workflow orchestration
│   │   ├── review_service.py      # Draft review logic
│   │   ├── publishing_service.py  # Publishing coordination
│   │   ├── platform_publisher.py  # Platform API integrations
│   │   ├── resource_service.py    # Resource management
│   │   └── auth_service.py        # Authentication
│   │
│   ├── schemas/             # Pydantic request/response models
│   ├── workers/             # Background workers (Dramatiq)
│   ├── core/                # Core utilities
│   │   ├── config.py        # Configuration management
│   │   ├── security.py      # JWT authentication
│   │   └── logging.py       # Logging setup
│   ├── db/                  # Database configuration
│   └── main.py              # FastAPI application entry point
│
├── alembic/                 # Database migrations
├── requirements.txt         # Python dependencies
├── .env.example             # Environment variables template
└── README.md                # This file
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key
- (Optional) Tavily API key for web search

### 1. Clone and Setup

```bash
cd Backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required variables:**

```env
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/morphpost

# JWT
JWT_SECRET_KEY=your-secret-key-min-32-chars

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# OpenAI
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4-turbo-preview

# Tavily (optional)
TAVILY_API_KEY=your-tavily-key
```

### 3. Database Setup

```bash
# Create database
createdb morphpost

# Run migrations
alembic upgrade head
```

### 4. Run the Server

```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at: `http://localhost:8000`

Interactive docs: `http://localhost:8000/docs` (development only)

### 5. Run Background Workers (Optional)

For scheduled publishing:

```bash
dramatiq src.workers.publisher
```

---

## 🔄 LangGraph Workflow

### Workflow Architecture

MorphPost uses a **fan-out/fan-in** architecture to process multiple platforms in parallel:

```mermaid
graph LR
    Start([START]) --> Fanout[Fanout Node]
    Fanout -->|Send| P1[Platform: LinkedIn]
    Fanout -->|Send| P2[Platform: X]
    Fanout -->|Send| P3[Platform: Blog]
    P1 --> Merge[Merge Results]
    P2 --> Merge
    P3 --> Merge
    Merge --> Check{All Complete?}
    Check -->|Yes| End([END])
    Check -->|No| Fanout
```

### Platform Subgraph (per platform)

Each platform runs this workflow independently:

```mermaid
graph TD
    Start([START]) --> Generate[Generate Draft]
    Generate --> Evaluate[Evaluate Draft]
    Evaluate --> Route{Score >= 70?}
    Route -->|Yes| HITL[Human Review]
    Route -->|No, Retries Left| Regenerate[Regenerate with Feedback]
    Route -->|No, Max Retries| HITL
    Regenerate --> Generate
    HITL --> End([END])
```

### State Persistence

- **LangGraph Checkpointer**: Stores workflow state in PostgreSQL
- **Enables**: Resume workflows, handle interruptions, human-in-the-loop
- **Thread ID**: Each workflow has a unique thread ID for state isolation

---

## 📡 API Endpoints

### Authentication

#### `POST /api/v1/auth/signup`
Create a new user account.

**Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

#### `POST /api/v1/auth/login`
Authenticate and get access token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

---

### Workflow Creation

#### `POST /api/v1/create`
Start a new content creation workflow.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "mode": "manual",
  "platforms": ["linkedin", "x", "blog"],
  "source_content": "AI is transforming software development...",
  "resources": [
    {
      "type": "style_sample",
      "content": "Previous writing sample...",
      "metadata": {}
    }
  ]
}
```

**Response:**
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### Workflow Status

#### `GET /api/v1/workflow/{workflow_id}`
Get current workflow status and drafts.

**Response:**
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "awaiting_review",
  "created_at": "2026-01-15T19:00:00Z",
  "platforms": [
    {
      "platform": "linkedin",
      "status": "awaiting_review",
      "active_draft": {
        "id": "draft-123",
        "content": "AI is revolutionizing...",
        "source": "ai",
        "created_at": "2026-01-15T19:01:00Z"
      }
    }
  ]
}
```

---

### Review & Approval

#### `POST /api/v1/review/accept`
Accept a draft for publishing.

**Request:**
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "linkedin"
}
```

#### `POST /api/v1/review/reject`
Reject a draft and regenerate.

**Request:**
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "platform": "linkedin",
  "feedback": "Too technical, make it more conversational"
}
```

---

### Publishing

#### `POST /api/v1/publish`
Publish approved content to platforms.

**Request:**
```json
{
  "workflow_id": "550e8400-e29b-41d4-a716-446655440000",
  "platforms": ["linkedin", "x"],
  "schedule_time": null  // null = immediate, or ISO timestamp
}
```

---

## 🔧 Configuration

### LangGraph Settings

```python
# src/core/config.py

langgraph_max_iterations: int = 3
evaluation_score_threshold: int = 70
style_drift_tolerance: float = 0.15
```

- **max_iterations**: Maximum regeneration attempts per platform
- **evaluation_score_threshold**: Minimum AI evaluation score to auto-accept
- **style_drift_tolerance**: Allowed deviation from user's writing style

### LLM Configuration

```python
openai_api_key: str
llm_model: str = "gpt-4-turbo-preview"
llm_temperature: float = 0.7
llm_max_tokens: int = 2000
```

---

## 🗄️ Database Schema

### Key Models

**Workflow** - Top-level workflow metadata
- `id` (UUID, PK)
- `user_id` (FK → User)
- `status` (enum: running, awaiting_review, completed)
- `mode` (enum: manual, template)

**PlatformState** - Per-platform state
- `id` (UUID, PK)
- `workflow_id` (FK → Workflow)
- `platform` (enum: linkedin, x, blog)
- `status` (enum: generating, evaluating, awaiting_review, accepted, rejected)
- `active_draft_id` (FK → Draft)

**Draft** - Generated content versions
- `id` (UUID, PK)
- `workflow_id` (FK → Workflow)
- `platform` (enum)
- `content` (text)
- `source` (enum: ai, human)

**Evaluation** - AI evaluation results
- `id` (UUID, PK)
- `draft_id` (FK → Draft)
- `score` (int 0-100)
- `feedback` (text)

---

## 🧪 Development

### Running Tests

```bash
pytest
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Code Style

```bash
# Format code
black src/

# Lint
pylint src/
```

---

## 🚢 Deployment

### Environment Variables

Ensure all required environment variables are set in production:

- Set `ENVIRONMENT=production`
- Set `DEBUG=false`
- Use strong `JWT_SECRET_KEY`
- Configure production database URL
- Set up Redis for background workers

### Running with Gunicorn

```bash
gunicorn src.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Background Workers

```bash
dramatiq src.workers.publisher --processes 4 --threads 8
```

---

## 📚 Additional Documentation

- [API Reference](./docs/API.md) - Detailed API documentation
- [LangGraph Guide](./docs/LANGGRAPH.md) - Workflow architecture deep dive
- [Database Schema](./docs/DATABASE.md) - Complete schema documentation
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment guide

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🆘 Support

For issues and questions:
- GitHub Issues: [MorphPost Issues](https://github.com/yourusername/morphpost/issues)
- Email: support@morphpost.com
