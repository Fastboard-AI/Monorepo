# FastboardAI Backend

Rust backend service for AI-powered candidate code style analysis and matching.

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

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Configure `.env`**
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   DATABASE_URL=postgresql://user:password@host/database?sslmode=require
   ```

4. **Run the server**
   ```bash
   cargo run
   ```

The server starts at `http://localhost:8000` by default.

## API Endpoints

### POST /add_to_db

Add a candidate to the database with AI-analyzed code characteristics.

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

**Response:**
```json
{
  "status": "success",
  "candidate_id": "uuid"
}
```

### POST /analyse_repo

Analyze a GitHub repository and return code characteristics (does not store in DB).

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

## Database Schema

```sql
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

## Project Structure

```
backend/
├── src/
│   ├── main.rs                    # Entry point, route mounting
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
│       └── ep_match_candidates.rs # (WIP) Matching endpoint
├── Cargo.toml                     # Dependencies
├── Rocket.toml                    # Rocket configuration
├── .env                           # Environment variables
└── .env.example                   # Example environment file
```

## Development

**Run in development mode:**
```bash
cargo run
```

**Build for production:**
```bash
cargo build --release
```

**Run tests:**
```bash
cargo test
```

## Configuration

### Rocket.toml

```toml
[default.databases.main]
url = "${DATABASE_URL}"
```

### Environment Variables

See `.env.example` for required variables.

## License

Private - FastboardAI
