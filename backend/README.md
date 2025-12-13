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
   ```sql
   CREATE TABLE teams (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name VARCHAR NOT NULL,
     target_role VARCHAR,
     compatibility_score INT DEFAULT 75,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE team_members (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
     name VARCHAR NOT NULL,
     role VARCHAR NOT NULL,
     skills JSONB DEFAULT '[]',
     experience_level VARCHAR DEFAULT 'mid',
     work_style JSONB DEFAULT '{}',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE jobs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title VARCHAR NOT NULL,
     description TEXT,
     location VARCHAR,
     required_skills JSONB DEFAULT '[]',
     experience_level VARCHAR DEFAULT 'any',
     status VARCHAR DEFAULT 'sourcing',
     team_id UUID REFERENCES teams(id),
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE candidates (
     id SERIAL PRIMARY KEY,
     name VARCHAR NOT NULL,
     degrees JSON NOT NULL,
     style JSON NOT NULL,
     github VARCHAR NOT NULL,
     email VARCHAR NOT NULL,
     stacks JSON NOT NULL,
     employed BOOLEAN NOT NULL
   );
   ```

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
Analyze a GitHub repository (does not store in DB).

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
│   └── endpoints/
│       ├── mod.rs                 # Endpoint exports
│       ├── ep_add_to_db.rs        # Add candidate endpoint
│       ├── ep_analyse_repo.rs     # Analyze repo endpoint
│       ├── ep_jobs.rs             # Jobs CRUD
│       ├── ep_teams.rs            # Teams CRUD + members
│       ├── ep_sourcing.rs         # Candidate sourcing (mock)
│       └── ep_match_candidates.rs # (WIP) Matching endpoint
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
