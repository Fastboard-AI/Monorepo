use rocket::{post, serde::json};
use rocket::response::content::RawJson;
use rocket_db_pools::Connection;
use serde::{Deserialize, Serialize};
use rand::Rng;
use sqlx::Row;
use std::collections::HashSet;
use genai::{Client, chat::{ChatMessage, ChatOptions, ChatRequest}};
use crate::db::MainDatabase;
use crate::matching::{
    CandidateSkill, CandidateExperience, RequiredSkill, ExplainableScore,
    skills::calculate_skill_score,
    experience::calculate_experience_score,
    team_fit::calculate_team_fit_score,
    culture::calculate_culture_score,
    calculate_talent_fit,
};

const MODEL_GEMINI: &str = "gemini-2.0-flash";

// ============================================
// Scraping Service Client
// ============================================

#[derive(Serialize)]
struct SearchTarget {
    role: String,
    location: String,
    filter_by_uni: bool,
    timeframe: String,
}

#[derive(Serialize)]
struct SearchRequest {
    targets: Vec<SearchTarget>,
}

#[derive(Deserialize, Debug)]
struct ProfileSearchResult {
    href: String,
    title: Option<String>,
    description: Option<String>,
}

/// Call the Python scraping service to search for LinkedIn profiles via DuckDuckGo
async fn search_linkedin_profiles(
    role: &str,
    location: &str,
    count: i32,
) -> Result<Vec<ProfileSearchResult>, Box<dyn std::error::Error + Send + Sync>> {
    let scraping_url = std::env::var("SCRAPING_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8001".to_string());

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let request = SearchRequest {
        targets: vec![SearchTarget {
            role: role.to_string(),
            location: location.to_string(),
            filter_by_uni: false,
            timeframe: "m".to_string(), // Last month
        }],
    };

    let response = client
        .post(format!("{}/api/search/profiles", scraping_url))
        .json(&request)
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(format!("Scraping service error: {}", response.status()).into());
    }

    let mut results: Vec<ProfileSearchResult> = response.json().await?;

    // Limit results to requested count
    results.truncate(count as usize);

    Ok(results)
}

// ============================================
// AI-Powered Query Expansion
// ============================================

const QUERY_EXPANSION_PROMPT: &str = r#"Given a job title, generate 5-8 alternative search terms that would find similar professionals on LinkedIn.

Job Title: {job_title}

Consider:
- Common abbreviations (e.g., "ML" for "Machine Learning")
- Alternative titles for the same role
- Related/similar job titles
- Industry-specific variations
- Senior/Lead/Staff variations if not already included

Return ONLY a JSON array of strings, no explanation. Example:
["Machine Learning Engineer", "ML Engineer", "AI Engineer", "Deep Learning Engineer", "Applied ML Engineer"]

Return ONLY the JSON array:"#;

/// Use Gemini to generate alternative search queries for a job title
async fn expand_search_queries(job_title: &str) -> Vec<String> {
    // Always include the original
    let mut queries = vec![job_title.to_string()];

    // Try AI expansion
    match generate_query_variations(job_title).await {
        Ok(variations) => {
            for v in variations {
                if !queries.contains(&v) {
                    queries.push(v);
                }
            }
        }
        Err(e) => {
            println!("[Sourcing] Query expansion failed: {}, using fallback", e);
            // Fallback: add common variations manually
            queries.extend(get_fallback_variations(job_title));
        }
    }

    queries
}

async fn generate_query_variations(job_title: &str) -> Result<Vec<String>, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.3);

    let prompt = QUERY_EXPANSION_PROMPT.replace("{job_title}", job_title);

    let chat_req = ChatRequest::new(vec![
        ChatMessage::user(prompt),
    ]);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let response = chat_res
        .content
        .joined_texts()
        .ok_or("No response from AI")?;

    // Parse JSON array from response
    let cleaned = response.trim();
    let json_str = if cleaned.starts_with('[') {
        cleaned.to_string()
    } else if let Some(start) = cleaned.find('[') {
        if let Some(end) = cleaned.rfind(']') {
            cleaned[start..=end].to_string()
        } else {
            return Ok(vec![]);
        }
    } else {
        return Ok(vec![]);
    };

    let variations: Vec<String> = serde_json::from_str(&json_str)?;
    Ok(variations)
}

/// Fallback variations for common job titles when AI is unavailable
fn get_fallback_variations(job_title: &str) -> Vec<String> {
    let title_lower = job_title.to_lowercase();
    let mut variations = Vec::new();

    // AI/ML variations
    if title_lower.contains("ai") || title_lower.contains("artificial intelligence") {
        variations.extend(vec![
            "Machine Learning Engineer".to_string(),
            "ML Engineer".to_string(),
            "Deep Learning Engineer".to_string(),
            "AI/ML Engineer".to_string(),
        ]);
    }

    if title_lower.contains("machine learning") || title_lower.contains("ml") {
        variations.extend(vec![
            "AI Engineer".to_string(),
            "Data Scientist".to_string(),
            "Applied Scientist".to_string(),
        ]);
    }

    // Data variations
    if title_lower.contains("data scientist") {
        variations.extend(vec![
            "ML Engineer".to_string(),
            "Data Analyst".to_string(),
            "Applied Scientist".to_string(),
        ]);
    }

    if title_lower.contains("data engineer") {
        variations.extend(vec![
            "Analytics Engineer".to_string(),
            "ETL Developer".to_string(),
            "Data Platform Engineer".to_string(),
        ]);
    }

    // Software engineer variations
    if title_lower.contains("software engineer") || title_lower.contains("developer") {
        variations.extend(vec![
            "Software Developer".to_string(),
            "SWE".to_string(),
            "Programmer".to_string(),
        ]);
    }

    if title_lower.contains("frontend") || title_lower.contains("front-end") {
        variations.extend(vec![
            "UI Developer".to_string(),
            "Frontend Developer".to_string(),
            "React Developer".to_string(),
        ]);
    }

    if title_lower.contains("backend") || title_lower.contains("back-end") {
        variations.extend(vec![
            "Backend Developer".to_string(),
            "Server Developer".to_string(),
            "API Developer".to_string(),
        ]);
    }

    if title_lower.contains("fullstack") || title_lower.contains("full stack") || title_lower.contains("full-stack") {
        variations.extend(vec![
            "Full Stack Developer".to_string(),
            "Fullstack Developer".to_string(),
            "Web Developer".to_string(),
        ]);
    }

    // DevOps variations
    if title_lower.contains("devops") {
        variations.extend(vec![
            "Site Reliability Engineer".to_string(),
            "SRE".to_string(),
            "Platform Engineer".to_string(),
            "Infrastructure Engineer".to_string(),
        ]);
    }

    variations
}

/// Search LinkedIn with multiple query variations and deduplicate results
async fn search_linkedin_with_expansion(
    job_title: &str,
    location: &str,
    count: i32,
) -> Vec<ProfileSearchResult> {
    let queries = expand_search_queries(job_title).await;
    println!("[Sourcing] Expanded '{}' into {} search queries", job_title, queries.len());

    let mut all_results: Vec<ProfileSearchResult> = Vec::new();
    let mut seen_hrefs: HashSet<String> = HashSet::new();

    for query in &queries {
        match search_linkedin_profiles(query, location, count).await {
            Ok(results) => {
                println!("[Sourcing] Query '{}': found {} profiles", query, results.len());
                for result in results {
                    // Deduplicate by href (LinkedIn URL)
                    if !seen_hrefs.contains(&result.href) {
                        seen_hrefs.insert(result.href.clone());
                        all_results.push(result);
                    }
                }
            }
            Err(e) => {
                println!("[Sourcing] Query '{}' failed: {}", query, e);
            }
        }

        // Small delay between queries to avoid rate limiting
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        // Stop if we have enough results
        if all_results.len() >= count as usize * 2 {
            break;
        }
    }

    println!("[Sourcing] Total unique profiles from all queries: {}", all_results.len());
    all_results
}

/// Parse a LinkedIn search result title to extract name and job title
/// Format is typically: "FirstName LastName - Job Title at Company | LinkedIn"
fn parse_linkedin_title(title: &str) -> (String, String) {
    // Remove " | LinkedIn" suffix if present
    let cleaned = title
        .trim_end_matches(" | LinkedIn")
        .trim_end_matches(" - LinkedIn");

    // Split on " - " to separate name from title
    if let Some(idx) = cleaned.find(" - ") {
        let name = cleaned[..idx].trim().to_string();
        let job_title = cleaned[idx + 3..].trim().to_string();
        (name, job_title)
    } else {
        (cleaned.to_string(), "Unknown".to_string())
    }
}

/// Extract potential skills from description text using keyword matching
fn extract_skills_from_description(description: &str) -> Vec<CandidateSkill> {
    let skill_keywords = [
        ("rust", "Rust"), ("python", "Python"), ("javascript", "JavaScript"),
        ("typescript", "TypeScript"), ("react", "React"), ("node", "Node.js"),
        ("java", "Java"), ("go", "Go"), ("golang", "Go"), ("c++", "C++"),
        ("aws", "AWS"), ("docker", "Docker"), ("kubernetes", "Kubernetes"),
        ("k8s", "Kubernetes"), ("postgresql", "PostgreSQL"), ("postgres", "PostgreSQL"),
        ("mongodb", "MongoDB"), ("redis", "Redis"), ("graphql", "GraphQL"),
        ("machine learning", "Machine Learning"), ("ml", "Machine Learning"),
        ("ai", "AI"), ("data science", "Data Science"), ("devops", "DevOps"),
        ("frontend", "Frontend"), ("backend", "Backend"), ("fullstack", "Full Stack"),
        ("full stack", "Full Stack"), ("sql", "SQL"), ("nosql", "NoSQL"),
        ("agile", "Agile"), ("scrum", "Scrum"), ("git", "Git"),
    ];

    let desc_lower = description.to_lowercase();
    let mut found_skills: Vec<CandidateSkill> = vec![];
    let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (keyword, skill_name) in skill_keywords {
        if desc_lower.contains(keyword) && !seen.contains(skill_name) {
            seen.insert(skill_name.to_string());
            found_skills.push(CandidateSkill {
                name: skill_name.to_string(),
                level: "intermediate".to_string(), // Default level since we can't know
            });
        }
    }

    found_skills
}

/// Convert a DDG search result to candidate data
fn convert_search_result_to_candidate(
    result: &ProfileSearchResult,
    source: &str,
) -> Option<GeneratedCandidateData> {
    let title = result.title.as_ref()?;
    let (name, job_title) = parse_linkedin_title(title);

    // Skip if name looks invalid
    if name.is_empty() || name.len() < 3 {
        return None;
    }

    // Extract skills from description
    let description = result.description.as_deref().unwrap_or("");
    let candidate_skills = extract_skills_from_description(description);

    // Convert to SkillMatch for response
    let skills: Vec<SkillMatch> = candidate_skills.iter()
        .map(|s| SkillMatch {
            name: s.name.clone(),
            level: s.level.clone(),
            match_type: "inferred".to_string(),
        })
        .collect();

    // Create minimal experience from job title
    let experience = vec![Experience {
        title: job_title.clone(),
        company: "Unknown".to_string(), // Would need scraping to get this
        duration: "Unknown".to_string(),
        description: description.to_string(),
    }];

    let candidate_experience = vec![CandidateExperience {
        title: job_title.clone(),
        company: "Unknown".to_string(),
        duration: "1 year".to_string(), // Default assumption
        description: Some(description.to_string()),
    }];

    // Extract LinkedIn username for links
    let linkedin_url = result.href.clone();

    Some(GeneratedCandidateData {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        title: job_title,
        location: "Unknown".to_string(), // Would need scraping to get this
        skills,
        candidate_skills,
        experience,
        candidate_experience,
        education: vec![], // Would need scraping to get this
        links: Links {
            github: None,
            linkedin: Some(linkedin_url),
            portfolio: None,
        },
        source: source.to_string(),
    })
}

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

    // Try to get real candidates from DDG search if linkedin is in sources
    let mut candidate_data: Vec<GeneratedCandidateData> = Vec::new();

    if sources.contains(&"linkedin".to_string()) {
        // Use job title as the search role with AI-powered query expansion
        let search_role = &job_data.title;

        println!("[Sourcing] Starting LinkedIn search with query expansion for: {}", search_role);

        // Use expanded search with multiple query variations
        let results = search_linkedin_with_expansion(search_role, "Sydney", count).await;

        println!("[Sourcing] Found {} total unique LinkedIn profiles", results.len());
        for result in &results {
            if let Some(candidate) = convert_search_result_to_candidate(result, "linkedin") {
                candidate_data.push(candidate);
            }
        }
    }

    // If we didn't get enough candidates from real search, fill with mock data
    let remaining = (count as usize).saturating_sub(candidate_data.len());
    if remaining > 0 {
        println!("[Sourcing] Generating {} mock candidates to fill remaining slots", remaining);
        for i in 0..remaining {
            let source = &sources[i % sources.len()];
            candidate_data.push(generate_candidate_data(source));
        }
    }

    // Score each candidate (async - may call AI services)
    let mut candidates: Vec<SourcingResult> = Vec::new();
    for data in candidate_data {
        let candidate = score_candidate(data, &job_data, &team_members).await;
        candidates.push(candidate);
    }

    RawJson(serde_json::to_string(&candidates).unwrap())
}
