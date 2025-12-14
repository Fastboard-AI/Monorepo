# FastboardAI Monorepo

AI-powered talent matching platform with team compatibility analysis.

## Architecture

```
├── backend/       # Rust API (Rocket + PostgreSQL + Gemini AI)
├── frontend/      # Next.js 16 (React 19 + Tailwind + Clerk Auth)
├── scraping/      # LinkedIn scraping (FastAPI + Playwright)
├── web_scraping/  # Developer profile scraping (FastAPI + Crawl4AI + Gemini AI)
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

Create a `.env` file in the monorepo root (Docker Compose reads this automatically):

```bash
cp .env.example .env
# Edit .env with your credentials
```

**Root `.env` file:**
```env
# Backend
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
GITHUB_TOKEN=ghp_your_github_token

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

All services (backend, frontend, web-scraping) read from this single root `.env` file.

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

For local development, you can either use the root `.env` file or create individual `.env` files in each service directory.

### Backend

```bash
cd backend
# Option 1: Create local .env
cp .env.example .env
# Edit .env with your credentials

# Option 2: Or set env vars directly
export GEMINI_API_KEY=...
export DATABASE_URL=...
export GITHUB_TOKEN=...

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

### Web Scraping Service (Crawl4AI + Gemini)

```bash
cd web_scraping
uv sync
uv run playwright install

# Set GEMINI_API_KEY in environment or .env file
uv run uvicorn web_scraping.main:app --reload --port 8002
```

Service runs at http://localhost:8002

---

## API Endpoints

### Backend API (port 8000)

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
| POST | `/api/teams/:id/members` | Add team member (triggers code analysis + score recalc) |
| PUT | `/api/teams/:id/members/:mid` | Update team member (re-triggers analysis if GitHub changes) |
| DELETE | `/api/teams/:id/members/:mid` | Remove member (recalculates team score) |
| POST | `/api/candidates` | Create candidate |
| POST | `/api/sourcing/search` | AI candidate sourcing |
| POST | `/add_to_db` | Add candidate with code analysis |
| POST | `/analyse_repo` | Analyze GitHub repo (clones repo) |
| POST | `/analyse_github` | Analyze GitHub user (full file analysis) |

### Web Scraping Service (port 8002)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/developer/extract` | Extract developer profile using LLM |
| POST | `/api/developer/batch` | Extract profiles from multiple URLs |
| POST | `/api/developer/github` | Extract from GitHub profile |
| POST | `/api/developer/portfolio` | Extract from portfolio site |
| POST | `/api/crawl` | Generic URL crawl |
| POST | `/api/markdown` | Get markdown content |
| POST | `/api/links` | Extract links from URL |

---

## Features

### Team Code Analysis

When adding team members with a GitHub username, the system analyzes their coding style using **full source file analysis**:

1. Fetches up to 30 code files across 5 repositories
2. Filters to actual code files (`.ts`, `.py`, `.rs`, `.go`, etc.)
3. Excludes `node_modules/`, `vendor/`, minified files
4. Sends up to 5,000 lines to Gemini AI for analysis

**Code Characteristics Analyzed:**
- Function size & complexity
- OOP vs Functional programming ratio
- Recursion vs Loop preferences
- Dependency coupling index
- Modularity score
- Nesting depth
- Abstraction layers
- Immutability patterns
- Error handling style
- Test structure

**Confidence Metrics:**
The UI displays analysis confidence showing files analyzed, lines processed, and languages detected.

### Team Compatibility Score

Teams have a compatibility score (0-100) that **auto-recalculates** when members are added, removed, or updated.

**Scoring Formula:**
| Factor | Points |
|--------|--------|
| Base score | 70 |
| Skill diversity | 0-15 |
| Experience level mix | 0-10 |
| Work style variety | 0-5 |
| **Maximum** | **100** |

Special cases:
- Empty team: 0
- Single member: 75

### Code Style Radar Chart

Team members with analyzed code display a chart badge on their avatar. Click any team member card to open a detail view showing:
- Full profile with GitHub, LinkedIn, and website links
- All skills and experience level
- Work style preferences
- Confidence metrics (files analyzed, lines, languages)
- Interactive radar chart visualizing all 10 code metrics

From the detail view, click **Edit** to update member details. If you change a team member's GitHub username, code analysis automatically re-runs in the background.

### LLM-Powered Web Scraping

The web scraping service uses **Gemini AI** to extract developer profiles from any webpage:

1. Crawl page with Playwright (via Crawl4AI)
2. Extract raw markdown, text, and links
3. Send content to Gemini for intelligent extraction
4. Return structured `DeveloperProfile` with name, title, bio, skills, projects, experience, education, and links

This replaces brittle regex-based extraction with robust LLM understanding.

### Team Member Fields

```json
{
  "name": "Sarah Chen",
  "role": "Senior Frontend Developer",
  "skills": [{ "name": "React", "level": "expert" }],
  "experience_level": "senior",
  "work_style": {
    "communication": "async",
    "collaboration": "balanced",
    "pace": "steady"
  },
  "github": "sarahchen",
  "linkedin": "https://linkedin.com/in/sarahchen",
  "website": "https://sarahchen.dev"
}
```

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
- Recharts (radar charts)

**Scraping (LinkedIn)**
- Python 3.11
- FastAPI
- Playwright
- DuckDuckGo Search

**Web Scraping (Developer Profiles)**
- Python 3.10
- FastAPI
- Crawl4AI + Playwright
- Google Gemini 2.0 Flash (LLM extraction)

---

## License

Private - FastboardAI
