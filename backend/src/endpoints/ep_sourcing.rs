use rocket::{post, serde::json};
use rocket::response::content::RawJson;
use rocket_db_pools::Connection;
use serde::{Deserialize, Serialize};
use rand::Rng;
use sqlx::Row;
use crate::db::MainDatabase;
use crate::matching::{
    CandidateSkill, CandidateExperience, RequiredSkill, ExplainableScore,
    skills::calculate_skill_score,
    experience::calculate_experience_score,
    team_fit::calculate_team_fit_score,
    culture::calculate_culture_score,
    calculate_talent_fit,
};

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct SourcingRequest {
    job_id: String,
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
    skills: ScoreDetail,
    experience: ScoreDetail,
    team_fit: ScoreDetail,
    culture: ScoreDetail,
}

#[derive(Serialize)]
struct ScoreDetail {
    score: i32,
    matched: Vec<String>,
    missing: Vec<String>,
    bonus: Vec<String>,
    reasoning: Option<String>,
}

impl From<ExplainableScore> for ScoreDetail {
    fn from(e: ExplainableScore) -> Self {
        ScoreDetail {
            score: e.score,
            matched: e.matched,
            missing: e.missing,
            bonus: e.bonus,
            reasoning: e.reasoning,
        }
    }
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

/// Job data fetched from database for scoring
struct JobData {
    required_skills: Vec<RequiredSkill>,
    experience_level: String,
    title: String,
    description: Option<String>,
}

/// Team member profile for compatibility scoring
struct TeamMemberData {
    developer_profile: Option<String>,
}

/// Parse required_skills from JSONB - supports both legacy and enhanced formats
fn parse_required_skills(json_value: &serde_json::Value) -> Vec<RequiredSkill> {
    match json_value.as_array() {
        Some(arr) => arr.iter().filter_map(|item| {
            if let Some(s) = item.as_str() {
                // Legacy format: just a string
                Some(RequiredSkill {
                    name: s.to_string(),
                    level: Some("intermediate".to_string()),
                    mandatory: Some(true),
                })
            } else if item.is_object() {
                // Enhanced format: object with name, level, mandatory
                serde_json::from_value(item.clone()).ok()
            } else {
                None
            }
        }).collect(),
        None => vec![],
    }
}

/// Intermediate struct for generated candidate data (before async scoring)
struct GeneratedCandidateData {
    id: String,
    name: String,
    title: String,
    location: String,
    skills: Vec<SkillMatch>,
    candidate_skills: Vec<CandidateSkill>,
    experience: Vec<Experience>,
    candidate_experience: Vec<CandidateExperience>,
    education: Vec<Education>,
    links: Links,
    source: String,
}

fn generate_candidate_data(source: &str) -> GeneratedCandidateData {
    let mut rng = rand::thread_rng();

    let first = FIRST_NAMES[rng.gen_range(0..FIRST_NAMES.len())];
    let last = LAST_NAMES[rng.gen_range(0..LAST_NAMES.len())];
    let name = format!("{} {}", first, last);

    let username = format!("{}{}", first.to_lowercase(), rng.gen_range(100..999));

    // Generate random skills for the mock candidate
    let num_skills = rng.gen_range(4..8);
    let candidate_skills: Vec<CandidateSkill> = (0..num_skills)
        .map(|_| {
            let skill = SKILLS[rng.gen_range(0..SKILLS.len())];
            let level = match rng.gen_range(0..4) {
                0 => "expert",
                1 => "advanced",
                2 => "intermediate",
                _ => "beginner",
            };
            CandidateSkill {
                name: skill.to_string(),
                level: level.to_string(),
            }
        })
        .collect();

    // Convert to SkillMatch for response
    let skills: Vec<SkillMatch> = candidate_skills.iter()
        .map(|s| SkillMatch {
            name: s.name.clone(),
            level: s.level.clone(),
            match_type: "exact".to_string(),
        })
        .collect();

    // Generate random experience
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

    // Convert to CandidateExperience for scoring
    let candidate_experience: Vec<CandidateExperience> = experience.iter()
        .map(|e| CandidateExperience {
            title: e.title.clone(),
            company: e.company.clone(),
            duration: e.duration.clone(),
            description: Some(e.description.clone()),
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

    let title = TITLES[rng.gen_range(0..TITLES.len())].to_string();
    let location = LOCATIONS[rng.gen_range(0..LOCATIONS.len())].to_string();

    GeneratedCandidateData {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        title,
        location,
        skills,
        candidate_skills,
        experience,
        candidate_experience,
        education,
        links,
        source: source.to_string(),
    }
}

async fn score_candidate(
    data: GeneratedCandidateData,
    job_data: &JobData,
    team_members: &[TeamMemberData],
) -> SourcingResult {
    // 1. Skills score
    let skills_score = calculate_skill_score(&data.candidate_skills, &job_data.required_skills);

    // 2. Experience score
    let experience_score = calculate_experience_score(
        &data.candidate_experience,
        &job_data.experience_level,
        Some(&job_data.title),
    );

    // 3. Team fit score (minimal for now since we don't have full team data)
    let candidate_skill_names: Vec<String> = data.candidate_skills.iter().map(|s| s.name.clone()).collect();
    let team_fit_score = calculate_team_fit_score(
        &candidate_skill_names,
        None, // candidate_work_style
        None, // candidate_code_style
        &[], // team_members - would need full TeamMemberProfile
        None, // ideal_profile
    );

    // 4. Culture score (AI-powered)
    let team_profiles: Vec<String> = team_members.iter()
        .filter_map(|m| m.developer_profile.clone())
        .collect();
    let culture_score = calculate_culture_score(
        None, // candidate_profile
        job_data.description.as_deref(),
        &team_profiles,
    ).await;

    // 5. Aggregate scores
    let talent_fit = calculate_talent_fit(
        skills_score,
        experience_score,
        team_fit_score,
        culture_score,
        None, // use default weights
    );

    SourcingResult {
        id: data.id,
        name: data.name,
        title: data.title,
        location: data.location,
        skills: data.skills,
        experience: data.experience,
        education: data.education,
        links: data.links,
        talent_fit_score: talent_fit.total,
        score_breakdown: ScoreBreakdown {
            skills: talent_fit.breakdown.skills.into(),
            experience: talent_fit.breakdown.experience.into(),
            team_fit: talent_fit.breakdown.team_fit.into(),
            culture: talent_fit.breakdown.culture.into(),
        },
        source: data.source,
    }
}

#[post("/sourcing/search", data = "<data>")]
pub async fn search_candidates(
    data: json::Json<SourcingRequest>,
    mut db: Connection<MainDatabase>,
) -> RawJson<String> {
    let count = data.count.min(50).max(1);
    let sources = if data.sources.is_empty() {
        vec!["github".to_string(), "linkedin".to_string()]
    } else {
        data.sources.clone()
    };

    // Fetch job data from database
    let job_data = if let Ok(job_uuid) = uuid::Uuid::parse_str(&data.job_id) {
        match sqlx::query(
            r#"SELECT title, description, required_skills, experience_level FROM jobs WHERE id = $1"#
        )
        .bind(job_uuid)
        .fetch_optional(&mut **db)
        .await
        {
            Ok(Some(row)) => {
                let skills_json: serde_json::Value = row.get("required_skills");
                JobData {
                    required_skills: parse_required_skills(&skills_json),
                    experience_level: row.get::<Option<String>, _>("experience_level")
                        .unwrap_or_else(|| "any".to_string()),
                    title: row.get("title"),
                    description: row.get("description"),
                }
            }
            _ => JobData {
                required_skills: vec![],
                experience_level: "any".to_string(),
                title: "Unknown Position".to_string(),
                description: None,
            },
        }
    } else {
        JobData {
            required_skills: vec![],
            experience_level: "any".to_string(),
            title: "Unknown Position".to_string(),
            description: None,
        }
    };

    // Fetch team member profiles if team_id is provided
    let team_members: Vec<TeamMemberData> = if let Some(ref team_id) = data.team_id {
        if let Ok(team_uuid) = uuid::Uuid::parse_str(team_id) {
            match sqlx::query(
                r#"SELECT developer_profile FROM team_members WHERE team_id = $1"#
            )
            .bind(team_uuid)
            .fetch_all(&mut **db)
            .await
            {
                Ok(rows) => rows.iter().map(|r| TeamMemberData {
                    developer_profile: r.get("developer_profile"),
                }).collect(),
                Err(_) => vec![],
            }
        } else {
            vec![]
        }
    } else {
        vec![]
    };

    // Generate candidate data (sync - uses random number generator)
    let candidate_data: Vec<GeneratedCandidateData> = (0..count)
        .map(|i| {
            let source = &sources[i as usize % sources.len()];
            generate_candidate_data(source)
        })
        .collect();

    // Score each candidate (async - may call AI services)
    let mut candidates: Vec<SourcingResult> = Vec::new();
    for data in candidate_data {
        let candidate = score_candidate(data, &job_data, &team_members).await;
        candidates.push(candidate);
    }

    RawJson(serde_json::to_string(&candidates).unwrap())
}
