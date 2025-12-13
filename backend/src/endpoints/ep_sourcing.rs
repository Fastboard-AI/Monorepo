use rocket::{post, serde::json};
use rocket::response::content::RawJson;
use serde::{Deserialize, Serialize};
use rand::Rng;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct SourcingRequest {
    #[allow(dead_code)]
    job_id: String,
    #[allow(dead_code)]
    team_id: Option<String>,
    sources: Vec<String>,
    count: i32,
}

#[derive(Serialize)]
struct SourcingResult {
    id: String,
    name: String,
    title: String,
    location: String,
    skills: Vec<SkillMatch>,
    experience: Vec<Experience>,
    education: Vec<Education>,
    links: Links,
    talent_fit_score: i32,
    score_breakdown: ScoreBreakdown,
    source: String,
}

#[derive(Serialize)]
struct SkillMatch {
    name: String,
    level: String,
    match_type: String,
}

#[derive(Serialize)]
struct Experience {
    title: String,
    company: String,
    duration: String,
    description: String,
}

#[derive(Serialize)]
struct Education {
    degree: String,
    institution: String,
    year: String,
}

#[derive(Serialize)]
struct Links {
    github: Option<String>,
    linkedin: Option<String>,
    portfolio: Option<String>,
}

#[derive(Serialize)]
struct ScoreBreakdown {
    skills: i32,
    experience: i32,
    culture: i32,
}

const FIRST_NAMES: &[&str] = &[
    "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Quinn", "Avery",
    "Jamie", "Cameron", "Drew", "Blake", "Reese", "Parker", "Hayden", "Emery",
    "Sage", "River", "Phoenix", "Rowan", "Finley", "Sawyer", "Marlowe", "Eden"
];

const LAST_NAMES: &[&str] = &[
    "Chen", "Patel", "Kim", "Williams", "Garcia", "Johnson", "Lee", "Martinez",
    "Brown", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Moore", "Jackson",
    "White", "Harris", "Martin", "Thompson", "Young", "Allen", "King", "Wright"
];

const TITLES: &[&str] = &[
    "Senior Software Engineer", "Full Stack Developer", "Frontend Engineer",
    "Backend Developer", "DevOps Engineer", "Data Engineer", "ML Engineer",
    "Platform Engineer", "Staff Engineer", "Engineering Lead"
];

const LOCATIONS: &[&str] = &[
    "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
    "Boston, MA", "Denver, CO", "Los Angeles, CA", "Chicago, IL",
    "Portland, OR", "Remote"
];

const SKILLS: &[&str] = &[
    "TypeScript", "React", "Node.js", "Python", "Rust", "Go", "PostgreSQL",
    "MongoDB", "AWS", "Docker", "Kubernetes", "GraphQL", "REST APIs",
    "System Design", "CI/CD", "TDD", "Agile", "Leadership"
];

const COMPANIES: &[&str] = &[
    "Google", "Meta", "Amazon", "Microsoft", "Apple", "Netflix", "Stripe",
    "Airbnb", "Uber", "Spotify", "Slack", "Dropbox", "Coinbase", "Figma",
    "Notion", "Linear", "Vercel", "Cloudflare", "DataDog", "Snowflake"
];

const UNIVERSITIES: &[&str] = &[
    "MIT", "Stanford", "UC Berkeley", "Carnegie Mellon", "Georgia Tech",
    "University of Washington", "UCLA", "UT Austin", "UIUC", "Cornell"
];

fn generate_mock_candidate(source: &str) -> SourcingResult {
    let mut rng = rand::thread_rng();

    let first = FIRST_NAMES[rng.gen_range(0..FIRST_NAMES.len())];
    let last = LAST_NAMES[rng.gen_range(0..LAST_NAMES.len())];
    let name = format!("{} {}", first, last);

    let username = format!("{}{}", first.to_lowercase(), rng.gen_range(100..999));

    let num_skills = rng.gen_range(4..8);
    let skills: Vec<SkillMatch> = (0..num_skills)
        .map(|_| {
            let skill = SKILLS[rng.gen_range(0..SKILLS.len())];
            let level = match rng.gen_range(0..3) {
                0 => "expert",
                1 => "proficient",
                _ => "familiar",
            };
            let match_type = match rng.gen_range(0..3) {
                0 => "exact",
                1 => "related",
                _ => "partial",
            };
            SkillMatch {
                name: skill.to_string(),
                level: level.to_string(),
                match_type: match_type.to_string(),
            }
        })
        .collect();

    let num_exp = rng.gen_range(2..4);
    let experience: Vec<Experience> = (0..num_exp)
        .map(|i| {
            let years = if i == 0 { rng.gen_range(1..3) } else { rng.gen_range(2..5) };
            Experience {
                title: TITLES[rng.gen_range(0..TITLES.len())].to_string(),
                company: COMPANIES[rng.gen_range(0..COMPANIES.len())].to_string(),
                duration: format!("{} years", years),
                description: "Led development of key features and mentored junior engineers.".to_string(),
            }
        })
        .collect();

    let education = vec![Education {
        degree: "B.S. Computer Science".to_string(),
        institution: UNIVERSITIES[rng.gen_range(0..UNIVERSITIES.len())].to_string(),
        year: format!("{}", rng.gen_range(2015..2023)),
    }];

    let links = match source {
        "github" => Links {
            github: Some(format!("https://github.com/{}", username)),
            linkedin: None,
            portfolio: if rng.gen_bool(0.3) { Some(format!("https://{}.dev", username)) } else { None },
        },
        "linkedin" => Links {
            github: if rng.gen_bool(0.5) { Some(format!("https://github.com/{}", username)) } else { None },
            linkedin: Some(format!("https://linkedin.com/in/{}", username)),
            portfolio: None,
        },
        _ => Links {
            github: Some(format!("https://github.com/{}", username)),
            linkedin: Some(format!("https://linkedin.com/in/{}", username)),
            portfolio: if rng.gen_bool(0.3) { Some(format!("https://{}.dev", username)) } else { None },
        },
    };

    let skills_score = rng.gen_range(70..98);
    let exp_score = rng.gen_range(65..95);
    let culture_score = rng.gen_range(60..95);
    let talent_fit = (skills_score + exp_score + culture_score) / 3;

    SourcingResult {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        title: TITLES[rng.gen_range(0..TITLES.len())].to_string(),
        location: LOCATIONS[rng.gen_range(0..LOCATIONS.len())].to_string(),
        skills,
        experience,
        education,
        links,
        talent_fit_score: talent_fit,
        score_breakdown: ScoreBreakdown {
            skills: skills_score,
            experience: exp_score,
            culture: culture_score,
        },
        source: source.to_string(),
    }
}

#[post("/api/sourcing/search", data = "<data>")]
pub async fn search_candidates(data: json::Json<SourcingRequest>) -> RawJson<String> {
    let count = data.count.min(50).max(1);
    let sources = if data.sources.is_empty() {
        vec!["github".to_string(), "linkedin".to_string()]
    } else {
        data.sources.clone()
    };

    let mut candidates: Vec<SourcingResult> = Vec::new();

    for i in 0..count {
        let source = &sources[i as usize % sources.len()];
        candidates.push(generate_mock_candidate(source));
    }

    RawJson(serde_json::to_string(&candidates).unwrap())
}
