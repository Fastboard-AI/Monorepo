# FastboardAI Web Scraping Service

Web scraping service specialized for **developer profiles and portfolios** using [Crawl4AI](https://github.com/unclecode/crawl4ai) and FastAPI.

## Features

- **Developer Profile Extraction**: Specialized parsing for developer pages
- **GitHub Profile Support**: Extract info from GitHub user profiles
- **Portfolio Parsing**: Parse personal portfolio websites
- **Skill Detection**: Automatically detect technologies and skills
- **Batch Processing**: Crawl multiple URLs concurrently
- **Generic Crawling**: Raw markdown/text extraction for any URL

## What Gets Extracted

From developer pages, the service extracts:
- **Name & Title**: Developer's name and job title
- **Bio**: About/introduction text
- **Location**: Where they're based
- **Skills**: Programming languages, frameworks, tools
- **Projects**: Portfolio projects with descriptions
- **Experience**: Work history
- **Links**: GitHub, LinkedIn, Twitter, email

## Prerequisites

- Python 3.10+
- [UV](https://docs.astral.sh/uv/) package manager

## Setup

1. **Install UV** (if not installed)
   ```bash
   # Windows
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

   # macOS/Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Install dependencies**
   ```bash
   cd web_scraping
   uv sync
   ```

3. **Install Playwright browsers**
   ```bash
   uv run playwright install
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

## Usage

Start the service:

```bash
uv run uvicorn web_scraping.main:app --reload --port 8002
```

## API Endpoints

### Developer Profile Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/developer/extract` | Extract developer profile from any URL |
| POST | `/api/developer/batch` | Extract profiles from multiple URLs |
| POST | `/api/developer/github` | Extract from GitHub profile |
| POST | `/api/developer/portfolio` | Extract from portfolio site |

### Generic Crawl Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/crawl` | Crawl a URL (raw) |
| POST | `/api/crawl/batch` | Crawl multiple URLs |
| POST | `/api/markdown` | Get markdown content |
| POST | `/api/links` | Extract links |

## Examples

### Extract Developer Profile (Auto-detect)

```bash
curl -X POST http://localhost:8002/api/developer/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://github.com/username",
    "page_type": "auto"
  }'
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "name": "John Doe",
    "title": "Senior Software Engineer",
    "bio": "Building cool stuff...",
    "location": "Sydney, Australia",
    "skills": ["Python", "TypeScript", "React", "AWS"],
    "projects": [
      {
        "name": "awesome-project",
        "description": "A cool project",
        "url": "https://github.com/username/awesome-project"
      }
    ],
    "experience": [
      {
        "title": "Software Engineer",
        "company": "Tech Corp"
      }
    ],
    "links": {
      "github": "https://github.com/username",
      "linkedin": "https://linkedin.com/in/johndoe",
      "email": "john@example.com"
    },
    "source_url": "https://github.com/username"
  }
}
```

### Extract GitHub Profile

```bash
curl -X POST "http://localhost:8002/api/developer/github?url=https://github.com/torvalds"
```

### Extract Portfolio

```bash
curl -X POST "http://localhost:8002/api/developer/portfolio?url=https://johndoe.dev"
```

### Batch Extract

```bash
curl -X POST http://localhost:8002/api/developer/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://github.com/user1",
      "https://github.com/user2",
      "https://developer-portfolio.com"
    ],
    "page_type": "auto"
  }'
```

## Supported Page Types

| Type | Description | Example |
|------|-------------|---------|
| `github` | GitHub user profiles | github.com/username |
| `portfolio` | Personal portfolio sites | johndoe.dev |
| `blog` | Developer blogs | dev.to/username |
| `auto` | Auto-detect from URL | (any) |

## Detected Skills

The service automatically detects 80+ technologies including:

- **Languages**: Python, JavaScript, TypeScript, Java, Go, Rust, C++, etc.
- **Frontend**: React, Vue, Angular, Next.js, Tailwind, etc.
- **Backend**: Node.js, Django, FastAPI, Spring, etc.
- **Databases**: PostgreSQL, MongoDB, Redis, etc.
- **Cloud/DevOps**: AWS, Docker, Kubernetes, etc.
- **AI/ML**: TensorFlow, PyTorch, etc.

## Project Structure

```
web_scraping/
├── pyproject.toml
├── Dockerfile
├── .dockerignore
├── .env.example
├── README.md
└── src/
    └── web_scraping/
        ├── __init__.py
        ├── main.py              # FastAPI entry point
        ├── api/
        │   ├── __init__.py
        │   └── routes.py        # API endpoints
        ├── crawler/
        │   ├── __init__.py
        │   ├── service.py       # Crawl4AI service
        │   └── developer.py     # Developer profile extractor
        └── models/
            ├── __init__.py
            └── schemas.py       # Pydantic models
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t fastboard-web-scraping .

# Run container
docker run -p 8002:8002 fastboard-web-scraping

# Or use docker compose from monorepo root
docker compose up web-scraping --build
```

## Notes

- First request may be slow as it initializes the browser
- GitHub profiles work best with a README in the profile
- Skill detection uses keyword matching (not AI)
- Rate limiting is recommended for batch requests
