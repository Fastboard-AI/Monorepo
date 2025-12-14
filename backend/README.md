# FastboardAI Backend

Rust backend service for AI-powered talent matching, team management, and candidate sourcing.

## Tech Stack

- **Framework:** Rocket 0.5.1
- **Database:** PostgreSQL (Neon serverless)
- **AI:** Google Gemini 2.0 Flash API
- **Runtime:** Tokio (async)

## Prerequisites

- Rust (2024 edition)
- PostgreSQL database (or Neon account)
- Google Gemini API key
- GitHub Personal Access Token (for `/analyse_github` endpoint)

## Setup

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Copy environment files**
   ```bash
   cp .env.example .env
   cp Rocket.toml.example Rocket.toml
   ```

3. **Configure `.env`**
   ```
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   GITHUB_TOKEN=ghp_your_github_token
   ```

4. **Configure `Rocket.toml`**
   ```toml
   [default]
   address = "0.0.0.0"
   port = 8000

   [default.databases.main]
   url = "postgresql://user:password@host/database?sslmode=require"
   ```

5. **Create database tables**

   Run the schema file in your Neon SQL console:
   ```bash
   # Copy contents of schema.sql and paste into Neon console
   # Or use psql if available:
   psql $DATABASE_URL -f schema.sql
   ```

   See `schema.sql` for the full schema including:
   - `teams` - Team definitions
   - `team_members` - Members with skills and work styles
   - `jobs` - Job postings with requirements
   - `candidates` - Candidates with AI-analyzed code characteristics
   - `sourced_candidates` - Candidates from AI Sourcing & Resume Matcher
   - `job_candidates` - Links candidates to jobs with match scores

6. **Run the server**
   ```bash
   cargo run
   ```

The server starts at `http://localhost:8000`.

---

## API Endpoints

### Jobs

#### GET /api/jobs
List all jobs.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Senior Engineer",
    "description": "...",
    "location": "Remote",
    "required_skills": ["Rust", "TypeScript"],
    "experience_level": "senior",
    "status": "sourcing",
    "team_id": "uuid",
    "candidate_ids": [],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /api/jobs/:id
Get a single job.

#### POST /api/jobs
Create a new job.

**Request:**
```json
{
  "title": "Senior Engineer",
  "description": "Build awesome things",
  "location": "Remote",
  "required_skills": ["Rust", "TypeScript"],
  "experience_level": "senior"
}
```

#### PUT /api/jobs/:id
Update a job.

**Request:**
```json
{
  "title": "Staff Engineer",
  "status": "reviewing",
  "team_id": "uuid"
}
```

#### DELETE /api/jobs/:id
Delete a job.

---

### Teams

#### GET /api/teams
List all teams with their members.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Platform Team",
    "target_role": "Backend Engineer",
    "compatibility_score": 85,
    "members": [
      {
        "id": "uuid",
        "name": "Alice",
        "role": "Tech Lead",
        "skills": [{"name": "Rust", "level": "expert"}],
        "experience_level": "senior",
        "work_style": {
          "communication": "async",
          "collaboration": "balanced",
          "pace": "steady"
        }
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

#### GET /api/teams/:id
Get a single team with members.

#### POST /api/teams
Create a new team.

**Request:**
```json
{
  "name": "Platform Team",
  "target_role": "Backend Engineer"
}
```

#### PUT /api/teams/:id
Update a team.

**Request:**
```json
{
  "name": "Core Platform Team",
  "compatibility_score": 90
}
```

#### DELETE /api/teams/:id
Delete a team (cascades to members).

#### POST /api/teams/:team_id/members
Add a member to a team.

**Request:**
```json
{
  "name": "Bob",
  "role": "Software Engineer",
  "skills": [
    {"name": "TypeScript", "level": "advanced"},
    {"name": "React", "level": "expert"}
  ],
  "experience_level": "mid",
  "work_style": {
    "communication": "sync",
    "collaboration": "collaborative",
    "pace": "fast"
  }
}
```

#### DELETE /api/teams/:team_id/members/:member_id
Remove a member from a team.

---

### Sourcing

#### POST /api/sourcing/search
Search for candidates (returns mock data).

**Request:**
```json
{
  "job_id": "uuid",
  "team_id": "uuid",
  "sources": ["github", "linkedin"],
  "count": 10
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Jane Smith",
    "title": "Senior Software Engineer",
    "location": "San Francisco, CA",
    "skills": [
      {"name": "TypeScript", "level": "expert", "match_type": "exact"}
    ],
    "experience": [
      {
        "title": "Staff Engineer",
        "company": "Google",
        "duration": "3 years",
        "description": "..."
      }
    ],
    "education": [
      {"degree": "B.S. Computer Science", "institution": "MIT", "year": "2018"}
    ],
    "links": {
      "github": "https://github.com/janesmith",
      "linkedin": "https://linkedin.com/in/janesmith"
    },
    "talent_fit_score": 87,
    "score_breakdown": {
      "skills": 92,
      "experience": 85,
      "culture": 84
    },
    "source": "github"
  }
]
```

---

### Candidates

#### POST /api/candidates
Create a new candidate (used by AI Sourcing & Resume Matcher).

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "title": "Senior Engineer",
  "skills": [{"name": "TypeScript", "level": "expert"}],
  "experience": [{"title": "Engineer", "company": "Acme", "duration": "3 years"}],
  "education": [{"degree": "B.S. CS", "institution": "MIT", "year": "2020"}],
  "links": {"github": "https://github.com/johndoe"},
  "talent_fit_score": 85,
  "score_breakdown": {
    "skillsMatch": 90,
    "experienceMatch": 80,
    "workStyleAlignment": 85,
    "teamFit": 85
  },
  "source": "ai_sourcing"
}
```

#### GET /api/jobs/:job_id/candidates
Get all candidates linked to a job.

**Response:**
```json
[
  {
    "id": "uuid",
    "candidate": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "title": "Senior Engineer",
      "skills": [{"name": "TypeScript", "level": "expert"}],
      "experience": [...],
      "education": [...],
      "links": {...},
      "talent_fit_score": 85,
      "score_breakdown": {...},
      "source": "ai_sourcing",
      "created_at": "2024-01-01T00:00:00Z"
    },
    "job_match_score": 88,
    "team_compatibility_score": 82,
    "added_at": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /api/jobs/:job_id/candidates
Link a candidate to a job.

**Request:**
```json
{
  "candidate_id": "uuid",
  "job_match_score": 88,
  "team_compatibility_score": 82
}
```

#### DELETE /api/jobs/:job_id/candidates/:candidate_id
Remove a candidate from a job.

---

### Code Analysis (AI)

#### POST /add_to_db
Add a candidate with AI-analyzed code characteristics.

**Request:**
```json
{
  "most_popular_repo": "https://github.com/user/repo",
  "github": "https://github.com/username",
  "name": "John Doe",
  "degrees": ["B.S. Computer Science"],
  "stacks": ["React", "Node.js", "PostgreSQL"],
  "email": "john@example.com",
  "employed": false
}
```

#### POST /analyse_repo
Analyze a GitHub repository by cloning it (does not store in DB).

**Request:**
```json
{
  "url": "https://github.com/user/repo"
}
```

**Response:**
```json
{
  "avg_lines_per_function": 25.5,
  "functional_vs_oop_ratio": 0.6,
  "recursion_vs_loop_ratio": 0.2,
  "dependency_coupling_index": 0.4,
  "modularity_index_score": 0.7,
  "avg_nesting_depth": 2.3,
  "abstraction_layer_count": 3.0,
  "immutability_score": 0.65,
  "error_handling_centralization_score": 0.5,
  "test_structure_modularity_ratio": 0.8
}
```

#### POST /analyse_github
Analyze a GitHub user's coding style via their commit history. This is more accurate for group projects as it only analyzes code the user actually wrote.

**Request:**
```json
{
  "username": "octocat"
}
```

**Response:**
```json
{
  "avg_lines_per_function": 25.5,
  "functional_vs_oop_ratio": 0.6,
  "recursion_vs_loop_ratio": 0.2,
  "dependency_coupling_index": 0.4,
  "modularity_index_score": 0.7,
  "avg_nesting_depth": 2.3,
  "abstraction_layer_count": 3.0,
  "immutability_score": 0.65,
  "error_handling_centralization_score": 0.5,
  "test_structure_modularity_ratio": 0.8
}
```

**How it works:**
- Fetches user's top 5 non-forked repositories
- Collects up to 50 commits authored by the user
- Extracts code patches/diffs from each commit (max 50 lines per patch)
- Skips merge commits and tiny changes (<5 lines)
- Sends to Gemini for analysis
- Returns CodeCharacteristics based only on code the user wrote

---

### GitHub Analysis (Deep)

#### POST /api/github/analyze/:username
Basic analysis - fetches 5 repos, analyzes ~30 files.

**Response:**
```json
{
  "username": "octocat",
  "profile": {
    "name": "The Octocat",
    "bio": "GitHub mascot",
    "avatar_url": "https://...",
    "public_repos": 8,
    "followers": 1000,
    "following": 10,
    "created_at": "2011-01-25T00:00:00Z"
  },
  "repositories": [...],
  "ai_analysis": {
    "ai_detection_score": 65.0,
    "ai_proficiency_score": 70.0,
    "code_authenticity_score": 55.0,
    "analysis_details": {
      "patterns_detected": ["..."],
      "confidence": 0.8,
      "reasoning": "..."
    }
  },
  "languages": {"TypeScript": 40, "Rust": 30, "Python": 30},
  "analyzed_at": "2024-01-01T00:00:00Z"
}
```

#### POST /api/github/analyze/:username/deep
Deep analysis - scans more repos, categorizes code excerpts by patterns.

**Response:** Same as above, plus:
```json
{
  "code_excerpts": {
    "error_handling": [{"repo_name": "...", "file_path": "...", "content": "..."}],
    "async_patterns": [...],
    "testing": [...],
    "logging": [...],
    "class_structure": [...],
    "functional_patterns": [...],
    "validation": [...],
    "naming_style": [...]
  },
  "analysis_metadata": {
    "chunks_analyzed": 25,
    "total_lines": 5000,
    "repos_analyzed": 5,
    "languages_detected": ["Rust", "TypeScript"]
  }
}
```

#### GET /api/github/profile/:username
AI-generated developer personality profile.

**Response:**
```json
{
  "username": "octocat",
  "profile": "A pragmatic developer who prefers..."
}
```

#### GET /api/github/profile/:username/deep
Deep profile with code excerpts for more specific observations.

---

## Code Characteristics

The AI analyzes repositories and returns 10 metrics:

| Metric | Description | Range |
|--------|-------------|-------|
| `avg_lines_per_function` | Average function length | 1-100+ |
| `functional_vs_oop_ratio` | Functional vs OOP style | 0.0-1.0 |
| `recursion_vs_loop_ratio` | Recursion preference | 0.0-1.0 |
| `dependency_coupling_index` | Module coupling | 0.0-1.0 |
| `modularity_index_score` | Code modularity | 0.0-1.0 |
| `avg_nesting_depth` | Control flow nesting | 1-10+ |
| `abstraction_layer_count` | Abstraction layers | 1-10+ |
| `immutability_score` | Immutable patterns | 0.0-1.0 |
| `error_handling_centralization_score` | Error handling approach | 0.0-1.0 |
| `test_structure_modularity_ratio` | Test organization | 0.0-1.0 |

---

## Project Structure

```
backend/
├── src/
│   ├── main.rs                    # Entry point, route mounting, CORS
│   ├── lib.rs                     # Library exports
│   ├── db.rs                      # Database configuration
│   ├── code_analysis/
│   │   ├── mod.rs                 # AI prompt configuration
│   │   ├── ai.rs                  # Gemini API integration
│   │   └── characteristics.rs     # CodeCharacteristics struct
│   ├── github/
│   │   ├── mod.rs                 # GitHub module exports
│   │   ├── api.rs                 # GitHub API client (repos, commits, trees, files)
│   │   ├── analyze.rs             # GitHub user analysis (basic + deep)
│   │   ├── stats.rs               # GitHubStats, AnalysisMetadata structs
│   │   ├── ai_analysis.rs         # AI usage detection (Gemini)
│   │   ├── ai_summary.rs          # Developer profile generation
│   │   ├── embeddings.rs          # Code chunking utilities
│   │   └── semantic_search.rs     # Code categorization by keywords
│   └── endpoints/
│       ├── mod.rs                 # Endpoint exports
│       ├── ep_add_to_db.rs        # Add candidate endpoint
│       ├── ep_analyse_repo.rs     # Analyze repo endpoint
│       ├── ep_analyse_github.rs   # Analyze GitHub user endpoint
│       ├── ep_github_analysis.rs  # Deep GitHub analysis endpoints
│       ├── ep_jobs.rs             # Jobs CRUD
│       ├── ep_teams.rs            # Teams CRUD + members
│       ├── ep_sourcing.rs         # Candidate sourcing (mock)
│       ├── ep_candidates.rs       # Candidates CRUD + job linking
│       └── ep_match_candidates.rs # (WIP) Matching endpoint
├── schema.sql                     # Database schema (run in Neon)
├── Cargo.toml                     # Dependencies
├── Rocket.toml                    # Rocket configuration
├── .env                           # Environment variables
└── .env.example                   # Example environment file
```

---

## Development

**Run in development mode:**
```bash
cargo run
```

**Build for production:**
```bash
cargo build --release
```

**Check compilation:**
```bash
cargo check
```

---

## Frontend Integration

The frontend connects to this backend via the API endpoints above.

**Frontend environment:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Frontend hooks:**
- `useJobs()` - Manages jobs via `/api/jobs`
- `useTeams()` - Manages teams via `/api/teams`

---

## License

Private - FastboardAI
