# FastboardAI Web Scraping Service

Web scraping service specialized for **developer profiles and portfolios** using [Crawl4AI](https://github.com/unclecode/crawl4ai), FastAPI, and **Google Gemini AI** for intelligent extraction.

## Features

- **LLM-Powered Extraction**: Uses Gemini AI to understand and extract developer info
- **Developer Profile Extraction**: Intelligent parsing for any developer page
- **GitHub Profile Support**: Extract info from GitHub user profiles
- **Portfolio Parsing**: Parse personal portfolio websites
- **Batch Processing**: Crawl multiple URLs concurrently
- **Generic Crawling**: Raw markdown/text extraction for any URL

## How It Works

1. **Crawl**: Playwright-based browser fetches the page
2. **Extract**: Raw markdown, text, and links are extracted
3. **LLM Analysis**: Content is sent to Gemini AI for intelligent extraction
4. **Structured Output**: Returns structured `DeveloperProfile` JSON

This replaces brittle regex-based extraction with robust LLM understanding that can handle any page structure.

## What Gets Extracted

From developer pages, the service extracts:
- **Name & Title**: Developer's name and job title
- **Bio**: About/introduction text
- **Location**: Where they're based
- **Skills**: Programming languages, frameworks, tools (any technology)
- **Projects**: Portfolio projects with descriptions, URLs, technologies
- **Experience**: Work history with title, company, duration
- **Education**: Degrees, institutions, fields
- **Links**: GitHub, LinkedIn, Twitter, portfolio, blog, email, resume

## Prerequisites

- Python 3.10+
- [UV](https://docs.astral.sh/uv/) package manager
- Google Gemini API key

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
   # Add your GEMINI_API_KEY to .env
   ```

   Or set the environment variable:
   ```bash
   export GEMINI_API_KEY=your_api_key_here
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
| POST | `/api/developer/extract` | Extract developer profile using LLM |
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
    "skills": ["Python", "TypeScript", "React", "AWS", "Docker"],
    "projects": [
      {
        "name": "awesome-project",
        "description": "A cool project that does amazing things",
        "url": "https://github.com/username/awesome-project",
        "technologies": ["Python", "FastAPI", "PostgreSQL"]
      }
    ],
    "experience": [
      {
        "title": "Software Engineer",
        "company": "Tech Corp",
        "duration": "2020 - Present",
        "description": "Building scalable backend systems"
      }
    ],
    "education": [
      {
        "degree": "Bachelor of Science",
        "institution": "University of Technology",
        "year": "2019",
        "field": "Computer Science"
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
        │   ├── developer.py     # Developer profile extractor
        │   └── llm.py           # Gemini LLM extraction
        └── models/
            ├── __init__.py
            └── schemas.py       # Pydantic models
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t fastboard-web-scraping .

# Run container (pass GEMINI_API_KEY)
docker run -p 8002:8002 -e GEMINI_API_KEY=your_key fastboard-web-scraping

# Or use docker compose from monorepo root
docker compose up web-scraping --build
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key for LLM extraction |
| `HOST` | No | Host to bind to (default: 0.0.0.0) |
| `PORT` | No | Port to bind to (default: 8002) |

## Notes

- First request may be slow as it initializes the browser
- LLM extraction provides much better results than regex-based parsing
- The service handles any page structure - no hardcoded patterns
- Rate limiting is recommended for batch requests
- Gemini API has usage limits - monitor your quota
