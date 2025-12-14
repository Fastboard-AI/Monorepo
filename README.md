# FastboardAI Monorepo

AI-powered talent matching platform with team compatibility analysis.

## Architecture

```
├── backend/       # Rust API (Rocket + PostgreSQL + Gemini AI)
├── frontend/      # Next.js 16 (React 19 + Tailwind + Clerk Auth)
├── scraping/      # LinkedIn scraping (FastAPI + Playwright)
├── web_scraping/  # General web scraping (FastAPI + Crawl4AI)
└── docker-compose.yml
```

## Quick Start with Docker

### Prerequisites

- Docker & Docker Compose
- Neon PostgreSQL database (or any PostgreSQL)
- Google Gemini API key
- GitHub Personal Access Token (classic, no scopes needed for public repos)
- Clerk authentication keys

### 1. Configure Environment

**Backend** (`backend/.env`):
```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
GITHUB_TOKEN=ghp_your_github_token
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### 2. Create Database Tables

Run `backend/schema.sql` in your Neon SQL console.

### 3. Run with Docker Compose

```bash
# Build and start all services
docker compose up --build

# Or run in background
docker compose up -d --build
```

Services:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Web Scraping**: http://localhost:8002

### 4. Stop Services

```bash
docker compose down
```

---

## Development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your credentials
cargo run
```

Server runs at http://localhost:8000

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local with your credentials
pnpm install
pnpm dev
```

App runs at http://localhost:3000

### Scraping Service (LinkedIn)

```bash
cd scraping
uv sync
uv run playwright install chromium

# Search-only mode
uv run uvicorn scraping.main:app --reload --port 8001

# With browser for profile scraping
uv run python -m scraping.main --with-browser
```

Service runs at http://localhost:8001

### Web Scraping Service (Crawl4AI)

```bash
cd web_scraping
uv sync
uv run playwright install

uv run uvicorn web_scraping.main:app --reload --port 8002
```

Service runs at http://localhost:8002

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| POST | `/api/jobs` | Create job |
| GET | `/api/jobs/:id` | Get job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| GET | `/api/jobs/:id/candidates` | Get job candidates |
| POST | `/api/jobs/:id/candidates` | Link candidate to job |
| DELETE | `/api/jobs/:id/candidates/:cid` | Remove candidate from job |
| GET | `/api/teams` | List all teams |
| POST | `/api/teams` | Create team |
| GET | `/api/teams/:id` | Get team |
| PUT | `/api/teams/:id` | Update team |
| DELETE | `/api/teams/:id` | Delete team |
| POST | `/api/teams/:id/members` | Add team member |
| DELETE | `/api/teams/:id/members/:mid` | Remove member |
| POST | `/api/candidates` | Create candidate |
| POST | `/api/sourcing/search` | AI candidate sourcing |
| POST | `/add_to_db` | Add candidate with code analysis |
| POST | `/analyse_repo` | Analyze GitHub repo (clones repo) |
| POST | `/analyse_github` | Analyze GitHub user (via commits) |

### Web Scraping Service (port 8002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/developer/extract` | Extract developer profile from URL |
| POST | `/api/developer/batch` | Extract profiles from multiple URLs |
| POST | `/api/developer/github` | Extract from GitHub profile |
| POST | `/api/developer/portfolio` | Extract from portfolio site |
| POST | `/api/crawl` | Generic URL crawl |
| POST | `/api/markdown` | Get markdown content |
| POST | `/api/links` | Extract links from URL |

---

## Tech Stack

**Backend**
- Rust 2024
- Rocket 0.5.1
- SQLx + PostgreSQL
- Google Gemini 2.0 Flash

**Frontend**
- Next.js 16
- React 19
- Tailwind CSS 4
- Clerk Authentication

**Scraping (LinkedIn)**
- Python 3.11
- FastAPI
- Playwright
- DuckDuckGo Search

**Web Scraping (Developer Profiles)**
- Python 3.10
- FastAPI
- Crawl4AI
- Playwright

---

## License

Private - FastboardAI
