use rocket::{post, serde::json};
use rocket::response::content::RawJson;
use rocket_db_pools::Connection;
use serde::{Deserialize, Serialize};
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

#[derive(Deserialize, Debug, Clone)]
struct ProfileSearchResult {
    href: String,
    title: Option<String>,
    description: Option<String>,
    // AI-extracted fields (populated after filtering)
    #[serde(default)]
    actual_role: Option<String>,
    #[serde(default)]
    actual_location: Option<String>,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
struct RelevanceFilterResult {
    index: usize,
    is_relevant: bool,
    actual_role: Option<String>,
    actual_location: Option<String>,
    #[serde(default)]
    reason: Option<String>, // Used for debugging rejected candidates
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

// ============================================
// AI-Powered Relevance Filtering
// ============================================

const BATCH_RELEVANCE_PROMPT: &str = r#"Analyze these LinkedIn search results for a {job_title} position in {job_location}.

For each result, determine:
1. Is this person in a role relevant to the job? (e.g., tech/engineering roles for tech jobs)
2. Are they located in or near the target location?

Results to analyze:
{results_json}

Return a JSON array with one entry per result (same order, same indices):
[
  {"index": 0, "is_relevant": true, "actual_role": "Software Engineer", "actual_location": "Sydney, Australia"},
  {"index": 1, "is_relevant": false, "reason": "unrelated field - freelance writer"},
  ...
]

Be strict - mark is_relevant as FALSE if:
- They are in an unrelated profession (writer, marketing, sales, HR, recruiter, etc. for a tech job)
- They are in a completely different country/region than the target location
- The result is not actually a person's LinkedIn profile (company page, job listing, etc.)
- The description doesn't indicate they work in the relevant field

For relevant candidates, extract:
- actual_role: Their current job title (best guess from the snippet)
- actual_location: Their location (city, country) if mentioned, or "Unknown"

Return ONLY the JSON array, no additional text."#;

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

/// Filter candidates using AI to check relevance to job and location
async fn batch_filter_candidates(
    results: &[ProfileSearchResult],
    job_title: &str,
    job_location: &str,
) -> Vec<(usize, String, String)> {
    if results.is_empty() {
        return vec![];
    }

    println!("[Sourcing] Filtering {} candidates with AI relevance check", results.len());

    // Build JSON array of results for the prompt
    let results_for_prompt: Vec<serde_json::Value> = results.iter().enumerate().map(|(i, r)| {
        serde_json::json!({
            "index": i,
            "title": r.title.as_deref().unwrap_or("Unknown"),
            "description": r.description.as_deref().unwrap_or("No description"),
        })
    }).collect();

    let results_json = serde_json::to_string_pretty(&results_for_prompt)
        .unwrap_or_else(|_| "[]".to_string());

    let prompt = BATCH_RELEVANCE_PROMPT
        .replace("{job_title}", job_title)
        .replace("{job_location}", job_location)
        .replace("{results_json}", &results_json);

    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.2);

    let chat_req = ChatRequest::new(vec![
        ChatMessage::user(prompt),
    ]);

    match client.exec_chat(MODEL_GEMINI, chat_req, Some(&options)).await {
        Ok(chat_res) => {
            if let Some(response) = chat_res.content.joined_texts() {
                // Parse JSON array from response
                let cleaned = response.trim();
                let json_str = if cleaned.starts_with('[') {
                    cleaned.to_string()
                } else if let Some(start) = cleaned.find('[') {
                    if let Some(end) = cleaned.rfind(']') {
                        cleaned[start..=end].to_string()
                    } else {
                        println!("[Sourcing] AI filter response missing closing bracket");
                        return fallback_filter(results);
                    }
                } else {
                    println!("[Sourcing] AI filter response not valid JSON array");
                    return fallback_filter(results);
                };

                match serde_json::from_str::<Vec<RelevanceFilterResult>>(&json_str) {
                    Ok(filter_results) => {
                        let relevant: Vec<(usize, String, String)> = filter_results
                            .into_iter()
                            .filter(|r| r.is_relevant)
                            .map(|r| (
                                r.index,
                                r.actual_role.unwrap_or_else(|| "Unknown".to_string()),
                                r.actual_location.unwrap_or_else(|| "Unknown".to_string()),
                            ))
                            .collect();

                        println!("[Sourcing] AI filter: {} of {} candidates are relevant", relevant.len(), results.len());
                        relevant
                    }
                    Err(e) => {
                        println!("[Sourcing] Failed to parse AI filter response: {}. Using fallback.", e);
                        fallback_filter(results)
                    }
                }
            } else {
                println!("[Sourcing] Empty AI filter response. Using fallback.");
                fallback_filter(results)
            }
        }
        Err(e) => {
            println!("[Sourcing] AI filter failed: {}. Using fallback.", e);
            fallback_filter(results)
        }
    }
}

/// Fallback filter when AI is unavailable - basic keyword filtering
fn fallback_filter(results: &[ProfileSearchResult]) -> Vec<(usize, String, String)> {
    // Keywords that indicate non-tech roles
    let exclude_keywords = [
        "writer", "writing", "copywriter", "content creator", "journalist",
        "marketing", "marketer", "sales", "account executive", "recruiter",
        "hr", "human resources", "talent acquisition", "photographer",
        "designer" /* unless UI/UX */, "artist", "musician", "actor",
        "teacher", "professor", "nurse", "doctor", "lawyer", "attorney",
        "accountant", "financial advisor", "real estate", "realtor",
    ];

    let include_keywords = [
        "engineer", "developer", "software", "programmer", "coding",
        "data", "machine learning", "ml", "ai", "devops", "sre",
        "architect", "technical", "backend", "frontend", "fullstack",
        "full stack", "cloud", "platform", "infrastructure",
    ];

    results.iter().enumerate().filter_map(|(i, r)| {
        let title_lower = r.title.as_deref().unwrap_or("").to_lowercase();
        let desc_lower = r.description.as_deref().unwrap_or("").to_lowercase();
        let combined = format!("{} {}", title_lower, desc_lower);

        // Check for exclusions
        let has_exclusion = exclude_keywords.iter().any(|kw| combined.contains(kw));

        // Check for inclusions (at least one tech keyword)
        let has_inclusion = include_keywords.iter().any(|kw| combined.contains(kw));

        // Include if has tech keyword and no exclusion, OR if we can't determine
        if has_inclusion && !has_exclusion {
            // Try to extract role from title
            let (_, role) = parse_linkedin_title(r.title.as_deref().unwrap_or("Unknown"));
            Some((i, role, "Unknown".to_string()))
        } else if !has_exclusion && !has_inclusion {
            // Uncertain - include with unknown role
            let (_, role) = parse_linkedin_title(r.title.as_deref().unwrap_or("Unknown"));
            Some((i, role, "Unknown".to_string()))
        } else {
            None
        }
    }).collect()
}

/// Search LinkedIn with multiple query variations, deduplicate, and filter results
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

        // Stop if we have enough raw results to filter
        if all_results.len() >= count as usize * 3 {
            break;
        }
    }

    println!("[Sourcing] Total unique profiles before filtering: {}", all_results.len());

    // Apply AI relevance filter
    let relevant_indices = batch_filter_candidates(&all_results, job_title, location).await;

    // Build filtered results with AI-extracted data
    let mut filtered_results: Vec<ProfileSearchResult> = Vec::new();
    for (index, actual_role, actual_location) in relevant_indices {
        if index < all_results.len() {
            let mut result = all_results[index].clone();
            result.actual_role = Some(actual_role);
            result.actual_location = Some(actual_location);
            filtered_results.push(result);
        }
    }

    println!("[Sourcing] Filtered to {} relevant profiles", filtered_results.len());
    filtered_results
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
    let (name, parsed_job_title) = parse_linkedin_title(title);

    // Skip if name looks invalid
    if name.is_empty() || name.len() < 3 {
        return None;
    }

    // Use AI-extracted role if available, otherwise fall back to parsed title
    let job_title = result.actual_role.clone()
        .unwrap_or(parsed_job_title);

    // Use AI-extracted location if available
    let location = result.actual_location.clone()
        .unwrap_or_else(|| "Unknown".to_string());

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
        location,
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

/// Job data fetched from database for scoring
struct JobData {
    required_skills: Vec<RequiredSkill>,
    experience_level: String,
    title: String,
    description: Option<String>,
    location: Option<String>,
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
            r#"SELECT title, description, location, required_skills, experience_level FROM jobs WHERE id = $1"#
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
                    location: row.get("location"),
                }
            }
            _ => JobData {
                required_skills: vec![],
                experience_level: "any".to_string(),
                title: "Unknown Position".to_string(),
                description: None,
                location: None,
            },
        }
    } else {
        JobData {
            required_skills: vec![],
            experience_level: "any".to_string(),
            title: "Unknown Position".to_string(),
            description: None,
            location: None,
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

        // Use job location if available, otherwise default to broad search
        let search_location = job_data.location.as_deref().unwrap_or("Australia");

        println!("[Sourcing] Starting LinkedIn search with query expansion for: {} in {}", search_role, search_location);

        // Use expanded search with multiple query variations
        let results = search_linkedin_with_expansion(search_role, search_location, count).await;

        println!("[Sourcing] Found {} total unique LinkedIn profiles", results.len());
        for result in &results {
            if let Some(candidate) = convert_search_result_to_candidate(result, "linkedin") {
                candidate_data.push(candidate);
            }
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
