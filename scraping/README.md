# FastboardAI Scraping Service

LinkedIn profile scraping and search service using FastAPI.

## Features

- **Profile Search**: Discover LinkedIn profiles via DuckDuckGo (no auth required)
- **Profile Scraping**: Scrape full LinkedIn profiles (requires manual login)
- **Local Storage**: SQLite database for discovered profiles

## Prerequisites

- Python 3.11+
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
   cd scraping
   uv sync
   ```

3. **Install Playwright browsers** (for profile scraping)
   ```bash
   uv run playwright install chromium
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```

## Usage

### Search-only Mode (No LinkedIn Login)

Search for LinkedIn profiles using DuckDuckGo:

```bash
uv run uvicorn scraping.main:app --reload --port 8001
```

### With Browser (LinkedIn Profile Scraping)

Start with browser for full profile scraping:

```bash
uv run python -m scraping.main --with-browser
```

This will:
1. Open a Chromium browser
2. Navigate to LinkedIn login
3. Wait for you to log in manually
4. Start the API server

## API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/search/profiles` | Search for profiles | No |
| POST | `/api/search/single` | Search single target | No |
| GET | `/api/profiles` | Get stored profiles | No |
| POST | `/api/scrape/profile` | Scrape single profile | Yes (browser) |
| GET | `/api/session/status` | Check session status | No |

### Search for Profiles

```bash
curl -X POST http://localhost:8001/api/search/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "targets": [
      {
        "role": "Software Engineer",
        "location": "Sydney",
        "filter_by_uni": false,
        "timeframe": "m"
      }
    ]
  }'
```

### Scrape a Profile (requires browser session)

```bash
curl -X POST http://localhost:8001/api/scrape/profile \
  -H "Content-Type: application/json" \
  -d '{
    "profile_url": "https://www.linkedin.com/in/satyanadella/"
  }'
```

## Timeframe Options

- `d` - Past day
- `w` - Past week
- `m` - Past month
- `y` - Past year

## Project Structure

```
scraping/
├── pyproject.toml
├── .python-version
├── .env.example
├── README.md
└── src/
    └── scraping/
        ├── __init__.py
        ├── main.py              # FastAPI entry point
        ├── api/
        │   ├── __init__.py
        │   └── routes.py        # API endpoints
        ├── scrapers/
        │   ├── __init__.py
        │   ├── linkedin.py      # LinkedIn profile scraper
        │   └── search.py        # DuckDuckGo profile search
        └── models/
            ├── __init__.py
            └── profile.py       # Pydantic models
```

## Notes

- LinkedIn scraping requires manual login (cookies expire)
- Search feature works without authentication
- Rate limiting is applied to avoid blocks
- Profiles are stored in `linkedin_profiles.db`

## Integration with Main App

The scraping service runs separately from the main Rust backend. The frontend continues to use mock data for now. To integrate:

1. Start scraping service on port 8001
2. Connect frontend to scraping API when ready
3. Replace mock candidate generation with real scraped data
