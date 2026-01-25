# MorphPost

AI-powered multi-platform content creation and publishing system. Transform your ideas into platform-optimized posts for LinkedIn, X/Twitter, and Blog with intelligent AI assistance.

## 🏗️ Architecture

**Frontend**: React + TypeScript + Vite + shadcn/ui  
**Backend**: FastAPI + LangGraph + PostgreSQL  
**AI Engine**: OpenAI GPT-4 with LangGraph workflow orchestration

```mermaid
graph TB
    User[User] --> Frontend[React Frontend]
    Frontend --> API[FastAPI Backend]
    API --> LangGraph[LangGraph Workflow Engine]
    LangGraph --> AI[OpenAI GPT-4]
    LangGraph --> DB[(PostgreSQL)]
    API --> Workers[Background Workers]
    Workers --> Platforms[LinkedIn/X/Blog APIs]
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+
- **Redis** 6+
- **OpenAI API Key**

### 1. Clone Repository

```bash
git clone <repository-url>
cd MorphPost
```

### 2. Backend Setup

```bash
cd Backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Setup database
createdb morphpost
alembic upgrade head

# Run server
uvicorn src.main:app --reload --port 8000
```

**Required Environment Variables:**
```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/morphpost
JWT_SECRET_KEY=your-secret-key-min-32-chars
REDIS_HOST=localhost
REDIS_PORT=6379
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4-turbo-preview
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend URL

# Run development server
npm run dev
```

**Environment Variables:**
```env
VITE_API_URL=http://localhost:8000
```

### 4. Run Background Workers (Optional)

For scheduled publishing:
```bash
cd Backend
dramatiq src.workers.publisher
```

## 📁 Project Structure

```
MorphPost/
├── Backend/                    # FastAPI backend
│   ├── src/
│   │   ├── api/v1/            # REST API endpoints
│   │   ├── langgraph/         # LangGraph workflow engine
│   │   │   ├── graph.py       # Main workflow orchestration
│   │   │   ├── nodes/         # Workflow nodes (generate, evaluate, etc.)
│   │   │   └── ai/            # AI integrations
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── services/          # Business logic
│   │   ├── schemas/           # Pydantic models
│   │   └── main.py            # FastAPI app entry
│   ├── alembic/               # Database migrations
│   └── requirements.txt
│
└── frontend/                   # React frontend
    ├── src/
    │   ├── components/        # Reusable UI components
    │   ├── pages/             # Page components
    │   ├── lib/               # API client & utilities
    │   ├── hooks/             # Custom React hooks
    │   └── contexts/          # React contexts
    ├── package.json
    └── vite.config.ts
```

## 🔄 How It Works

### Workflow Process

1. **Create**: User provides source content and selects platforms
2. **Generate**: AI generates platform-optimized drafts in parallel
3. **Evaluate**: Each draft is automatically evaluated (score 0-100)
4. **Review**: User reviews, accepts, or provides feedback for regeneration
5. **Publish**: Approved content is published immediately or scheduled

### LangGraph Workflow

```mermaid
graph TD
    Start([User Creates Post]) --> Fanout[Fanout to Platforms]
    Fanout --> L[LinkedIn Subgraph]
    Fanout --> X[X/Twitter Subgraph]
    Fanout --> B[Blog Subgraph]
    L --> Generate1[Generate Draft]
    X --> Generate2[Generate Draft]
    B --> Generate3[Generate Draft]
    Generate1 --> Eval1[AI Evaluation]
    Generate2 --> Eval2[AI Evaluation]
    Generate3 --> Eval3[AI Evaluation]
    Eval1 --> Route1{Score >= 70?}
    Eval2 --> Route2{Score >= 70?}
    Eval3 --> Route3{Score >= 70?}
    Route1 -->|Yes| Review1[Human Review]
    Route1 -->|No| Regen1[Regenerate]
    Regen1 --> Generate1
    Review1 --> Merge[Merge Results]
    Route2 -->|Yes| Review2[Human Review]
    Route2 -->|No| Regen2[Regenerate]
    Regen2 --> Generate2
    Review2 --> Merge
    Route3 -->|Yes| Review3[Human Review]
    Route3 -->|No| Regen3[Regenerate]
    Regen3 --> Generate3
    Review3 --> Merge
    Merge --> End([Complete])
```

## 🔑 Key Features

- **Multi-Platform Support**: LinkedIn, X/Twitter, Blog
- **AI Content Generation**: GPT-4 powered content creation
- **Style Matching**: Learns from your writing samples
- **Parallel Processing**: Generate content for all platforms simultaneously
- **Auto-Evaluation**: AI evaluates drafts before human review
- **Smart Regeneration**: Iterative improvement with feedback
- **Scheduled Publishing**: Publish now or schedule for later
- **Workflow Persistence**: Resume interrupted workflows
- **Human-in-the-Loop**: Review and refine before publishing

## 📡 API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Create account
- `POST /api/v1/auth/login` - Login

### Workflow
- `POST /api/v1/create` - Start new workflow
- `GET /api/v1/workflow/{id}` - Get workflow status
- `POST /api/v1/review/accept` - Accept draft
- `POST /api/v1/review/reject` - Reject and regenerate
- `POST /api/v1/publish` - Publish content

### User
- `GET /api/v1/user/me` - Get current user
- `GET /api/v1/stats` - Get user statistics

API Documentation: `http://localhost:8000/docs` (development only)

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **shadcn/ui** - UI components
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **React Query** - Data fetching
- **Axios** - HTTP client
- **Zod** - Schema validation

### Backend
- **FastAPI** - Web framework
- **LangGraph** - AI workflow orchestration
- **SQLAlchemy 2.0** - Async ORM
- **PostgreSQL** - Database
- **OpenAI GPT-4** - AI model
- **Dramatiq + Redis** - Background jobs
- **Alembic** - Database migrations
- **Pydantic** - Data validation

## 🧪 Development

### Backend Tests
```bash
cd Backend
pytest
```

### Frontend Build
```bash
cd frontend
npm run build
```

### Database Migrations
```bash
cd Backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## 🚢 Deployment

### Backend (Production)
```bash
gunicorn src.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

### Frontend (Production)
```bash
npm run build
# Deploy dist/ folder to your hosting service
```

### Environment Variables
- Set `ENVIRONMENT=production`
- Set `DEBUG=false`
- Use strong `JWT_SECRET_KEY`
- Configure production database
- Set up Redis for workers

## 📚 Documentation

- [Backend API Reference](./Backend/docs/API.md)
- [LangGraph Architecture](./Backend/docs/LANGGRAPH.md)
- [Database Schema](./Backend/docs/DATABASE.md)
- [Deployment Guide](./Backend/docs/DEPLOYMENT.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/morphpost/issues)
- Email: support@morphpost.com

---

**Built with ❤️ using FastAPI, React, and LangGraph**
