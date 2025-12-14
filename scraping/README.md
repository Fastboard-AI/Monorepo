# FastboardAI Scraping Service

LinkedIn profile discovery and developer site search service using FastAPI.

## Features

- **LinkedIn Profile Search**: Discover LinkedIn profiles via DuckDuckGo (no auth required)
- **Developer Site Discovery**: Find GitHub profiles, portfolios, and blogs
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

## Quick Start

```bash
# Start the API server
uv run uvicorn scraping.main:app --reload --port 8001

# Health check
curl http://localhost:8001/health
```

## API Reference

### Health Check

```
GET /health
```

Returns service status and whether a browser session is active.

---

### LinkedIn Profile Search

Search for LinkedIn profiles using DuckDuckGo. No authentication required.

#### Search Multiple Targets

```
POST /api/search/profiles
```

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

#### Search Single Target

```
POST /api/search/single
```

```bash
curl -X POST http://localhost:8001/api/search/single \
  -H "Content-Type: application/json" \
  -d '{
    "role": "Data Scientist",
    "location": "Melbourne",
    "filter_by_uni": false,
    "timeframe": "m"
  }'
```

**Response:**
```json
[
  {
    "href": "https://au.linkedin.com/in/john-doe-123456",
    "title": "John Doe - Senior Software Engineer | LinkedIn",
    "description": "Senior Software Engineer at Company..."
  }
]
```

**Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `role` | string | Job title to search for |
| `location` | string | Location (city, country) |
| `filter_by_uni` | boolean | Filter by Australian universities |
| `timeframe` | string | Time filter: `d` (day), `w` (week), `m` (month), `y` (year) |

---

### Developer Site Discovery

Search for developer personal sites, portfolios, and blogs.

#### Search by POST

```
POST /api/search/dev-sites
```

```bash
curl -X POST http://localhost:8001/api/search/dev-sites \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dan Abramov",
    "keywords": ["React", "JavaScript"],
    "include_github": true,
    "include_portfolio": true,
    "include_blog": true
  }'
```

#### Search by GET (convenience)

```
GET /api/search/dev-sites/{name}?keywords=skill1,skill2
```

```bash
curl "http://localhost:8001/api/search/dev-sites/Dan%20Abramov?keywords=React,Redux"
```

**Response:**
```json
[
  {
    "url": "https://github.com/gaearon",
    "title": "Dan Abramov (gaearon) · GitHub",
    "description": "Co-author of Redux...",
    "site_type": "github"
  },
  {
    "url": "https://medium.com/@dan_abramov",
    "title": "Dan Abramov – Medium",
    "description": "Read writing from Dan Abramov...",
    "site_type": "blog"
  },
  {
    "url": "https://overreacted.io",
    "title": "Overreacted — A blog by Dan Abramov",
    "description": "Personal blog...",
    "site_type": "blog"
  }
]
```

**Parameters:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | string | required | Developer name to search |
| `keywords` | list | `[]` | Skills, companies, technologies |
| `include_github` | boolean | `true` | Search for GitHub profiles |
| `include_portfolio` | boolean | `true` | Search for portfolio sites |
| `include_blog` | boolean | `true` | Search for dev blogs |

**Site Types:**

| Type | Description |
|------|-------------|
| `github` | GitHub profiles and GitHub Pages |
| `portfolio` | Personal portfolio websites |
| `blog` | Developer blogs (dev.to, Medium, Hashnode, personal) |
| `other` | Other relevant developer sites |

---

### Stored Profiles

```
GET /api/profiles
```

Returns all LinkedIn profiles stored in the local database.

---

### Profile Scraping (Requires Browser Session)

Scrape full LinkedIn profile data. Requires starting the service with `--with-browser`.

```bash
# Start with browser
uv run python -m scraping.main --with-browser
```

This opens a browser for manual LinkedIn login, then starts the API.

```
POST /api/scrape/profile
```

```bash
curl -X POST http://localhost:8001/api/scrape/profile \
  -H "Content-Type: application/json" \
  -d '{
    "profile_url": "https://www.linkedin.com/in/satyanadella/"
  }'
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "urn": "ACoAAA...",
    "first_name": "Satya",
    "last_name": "Nadella",
    "full_name": "Satya Nadella",
    "headline": "Chairman and CEO at Microsoft",
    "positions": [...],
    "educations": [...]
  }
}
```

---

### Session Status

```
GET /api/session/status
```

Check if a browser session is active for profile scraping.

---

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | No |
| POST | `/api/search/profiles` | Search LinkedIn profiles (multiple) | No |
| POST | `/api/search/single` | Search LinkedIn profiles (single) | No |
| POST | `/api/search/dev-sites` | Search developer sites | No |
| GET | `/api/search/dev-sites/{name}` | Search developer sites by name | No |
| GET | `/api/profiles` | Get stored profiles | No |
| POST | `/api/scrape/profile` | Scrape full profile | Yes (browser) |
| GET | `/api/session/status` | Check browser session | No |

## Integration with Rust Backend

The scraping service integrates with the main Rust backend for candidate sourcing.

**Environment Variable:**
```
SCRAPING_SERVICE_URL=http://localhost:8001
```

**Flow:**
1. Backend receives sourcing request
2. Calls scraping service for LinkedIn profiles
3. Optionally searches for dev sites by candidate name
4. Converts results to candidate format
5. Scores using matching engine

## Project Structure

```
scraping/
├── pyproject.toml
├── README.md
└── src/
    └── scraping/
        ├── __init__.py
        ├── main.py                 # FastAPI entry point
        ├── api/
        │   ├── __init__.py
        │   └── routes.py           # API endpoints
        ├── scrapers/
        │   ├── __init__.py
        │   ├── linkedin.py         # LinkedIn profile scraper
        │   └── search.py           # DDG search (LinkedIn + dev sites)
        └── models/
            ├── __init__.py
            └── profile.py          # Pydantic models
```

## Technical Notes

### Search Limitations

- DuckDuckGo search uses the `lite` backend for best results
- Time filters (`timeframe`) are disabled as they force Bing backend which blocks LinkedIn
- Results quality depends on the person's online presence
- Well-known developers yield better results than obscure names

### Rate Limiting

- 2 second delay between LinkedIn searches
- 1 second delay between dev site searches
- Prevents IP blocking from search engines

### Excluded Domains

Dev site search excludes non-personal sites:
- Social media (LinkedIn, Facebook, Twitter, etc.)
- Job boards (Indeed, Glassdoor, etc.)
- Generic sites (Wikipedia, Amazon, etc.)
- Package registries (npm, PyPI, crates.io)

### Database

Discovered LinkedIn profiles are stored in `linkedin_profiles.db` (SQLite):

```sql
CREATE TABLE profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    href TEXT UNIQUE,
    title TEXT,
    description TEXT,
    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Troubleshooting

**Empty search results:**
- The `lite` backend should be used (no `timelimit`)
- Check if the search query is too specific
- Try broader keywords

**Browser session not working:**
- Ensure Playwright is installed: `uv run playwright install chromium`
- LinkedIn may require re-authentication periodically

**Rate limited:**
- Wait a few minutes before retrying
- The service includes built-in delays to prevent this
