use rocket::{get, post, delete, serde::json};
use rocket_db_pools::Connection;
use rocket::response::content::RawJson;
use serde::{Deserialize, Serialize};
use crate::db::MainDatabase;
use crate::github::analyze::analyze_github_user_deep;
use crate::github::ai_summary::generate_developer_profile;
use sqlx::Row;

#[derive(Deserialize, Serialize, Clone)]
#[serde(crate = "rocket::serde")]
pub struct SkillInput {
    name: String,
    level: String,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(crate = "rocket::serde")]
pub struct ExperienceInput {
    title: String,
    company: String,
    duration: String,
    description: Option<String>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(crate = "rocket::serde")]
pub struct EducationInput {
    degree: String,
    institution: String,
    year: String,
}

#[derive(Deserialize, Serialize, Clone, Default)]
#[serde(crate = "rocket::serde")]
pub struct LinksInput {
    github: Option<String>,
    linkedin: Option<String>,
    portfolio: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Default)]
#[serde(crate = "rocket::serde")]
pub struct ScoreBreakdownInput {
    #[serde(rename = "skillsMatch")]
    skills_match: i32,
    #[serde(rename = "experienceMatch")]
    experience_match: i32,
    #[serde(rename = "workStyleAlignment")]
    work_style_alignment: i32,
    #[serde(rename = "teamFit")]
    team_fit: i32,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct CreateCandidate {
    name: String,
    email: Option<String>,
    phone: Option<String>,
    location: Option<String>,
    title: String,
    skills: Vec<SkillInput>,
    experience: Vec<ExperienceInput>,
    education: Vec<EducationInput>,
    links: LinksInput,
    talent_fit_score: i32,
    score_breakdown: ScoreBreakdownInput,
    resume_file_name: Option<String>,
    source: String,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct LinkCandidateToJob {
    candidate_id: String,
    job_match_score: Option<i32>,
    team_compatibility_score: Option<i32>,
}

#[derive(Serialize)]
pub struct CandidateRow {
    id: String,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    location: Option<String>,
    title: String,
    skills: Vec<SkillInput>,
    experience: Vec<ExperienceInput>,
    education: Vec<EducationInput>,
    links: LinksInput,
    talent_fit_score: i32,
    score_breakdown: ScoreBreakdownInput,
    resume_file_name: Option<String>,
    source: String,
    created_at: String,
    // GitHub enrichment fields (populated async)
    code_characteristics: Option<serde_json::Value>,
    ai_detection_score: Option<f64>,
    ai_proficiency_score: Option<f64>,
    code_authenticity_score: Option<f64>,
    ai_analysis_details: Option<serde_json::Value>,
    developer_profile: Option<String>,
    analysis_metadata: Option<serde_json::Value>,
    github_stats: Option<serde_json::Value>,
    analysis_status: String,
}

#[derive(Serialize)]
pub struct JobCandidateRow {
    id: String,
    candidate: CandidateRow,
    job_match_score: i32,
    team_compatibility_score: i32,
    added_at: String,
}

/// Extract GitHub username from a GitHub URL
fn extract_github_username(url: &str) -> Option<String> {
    let url = url.trim().trim_end_matches('/');

    // Handle various GitHub URL formats
    if url.starts_with("https://github.com/") {
        url.strip_prefix("https://github.com/")
            .and_then(|s| s.split('/').next())
            .map(|s| s.to_string())
    } else if url.starts_with("http://github.com/") {
        url.strip_prefix("http://github.com/")
            .and_then(|s| s.split('/').next())
            .map(|s| s.to_string())
    } else if url.starts_with("github.com/") {
        url.strip_prefix("github.com/")
            .and_then(|s| s.split('/').next())
            .map(|s| s.to_string())
    } else {
        None
    }
}

#[post("/candidates", data = "<data>")]
pub async fn create_candidate(data: json::Json<CreateCandidate>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let id = uuid::Uuid::new_v4();

    // Check if candidate has a GitHub link for auto-enrichment
    let github_username = data.links.github.as_ref()
        .and_then(|url| extract_github_username(url));

    // Set initial analysis status based on whether GitHub link exists
    let initial_status = if github_username.is_some() { "analyzing" } else { "complete" };

    // Insert candidate immediately with analysis status
    sqlx::query(
        r#"INSERT INTO sourced_candidates
           (id, name, email, phone, location, title, skills, experience, education, links, talent_fit_score, score_breakdown, resume_file_name, source, analysis_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)"#
    )
    .bind(id)
    .bind(&data.name)
    .bind(&data.email)
    .bind(&data.phone)
    .bind(&data.location)
    .bind(&data.title)
    .bind(serde_json::to_value(&data.skills).unwrap())
    .bind(serde_json::to_value(&data.experience).unwrap())
    .bind(serde_json::to_value(&data.education).unwrap())
    .bind(serde_json::to_value(&data.links).unwrap())
    .bind(data.talent_fit_score)
    .bind(serde_json::to_value(&data.score_breakdown).unwrap())
    .bind(&data.resume_file_name)
    .bind(&data.source)
    .bind(initial_status)
    .execute(&mut **db)
    .await
    .unwrap();

    // Spawn background task for deep GitHub analysis if username was extracted
    if let Some(username) = github_username {
        let db_url = std::env::var("DATABASE_URL").unwrap_or_default();
        let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();
        let candidate_id = id.to_string();

        if !db_url.is_empty() && !token.is_empty() {
            tokio::spawn(async move {
                // Run deep GitHub analysis with code excerpts
                let stats = analyze_github_user_deep(&username, &token)
                    .await
                    .ok();

                // Generate developer profile from stats (uses code excerpts if available)
                let profile = if let Some(ref s) = stats {
                    generate_developer_profile(s)
                        .await
                        .ok()
                } else {
                    None
                };

                // Update candidate record with enrichment data
                if let Ok(pool) = sqlx::PgPool::connect(&db_url).await {
                    let candidate_uuid = uuid::Uuid::parse_str(&candidate_id).unwrap();

                    if let Some(ref stats) = stats {
                        // Update all GitHub enrichment fields
                        let _ = sqlx::query(
                            r#"UPDATE sourced_candidates SET
                               code_characteristics = $1,
                               ai_detection_score = $2,
                               ai_proficiency_score = $3,
                               code_authenticity_score = $4,
                               ai_analysis_details = $5,
                               analysis_metadata = $6,
                               github_stats = $7,
                               developer_profile = $8,
                               analysis_status = 'complete'
                               WHERE id = $9"#
                        )
                        .bind(serde_json::to_value(&stats.ai_analysis).unwrap())
                        .bind(stats.ai_analysis.ai_detection_score as f64)
                        .bind(stats.ai_analysis.ai_proficiency_score as f64)
                        .bind(stats.ai_analysis.code_authenticity_score as f64)
                        .bind(serde_json::to_value(&stats.ai_analysis.analysis_details).unwrap())
                        .bind(serde_json::to_value(&stats.analysis_metadata).unwrap())
                        .bind(serde_json::to_value(&stats).unwrap())
                        .bind(&profile)
                        .bind(candidate_uuid)
                        .execute(&pool)
                        .await;
                    } else {
                        // Mark as failed if analysis didn't work
                        let _ = sqlx::query(
                            "UPDATE sourced_candidates SET analysis_status = 'failed' WHERE id = $1"
                        )
                        .bind(candidate_uuid)
                        .execute(&pool)
                        .await;
                    }
                }
            });
        }
    }

    // Return candidate immediately (without waiting for analysis)
    let candidate = CandidateRow {
        id: id.to_string(),
        name: data.name.clone(),
        email: data.email.clone(),
        phone: data.phone.clone(),
        location: data.location.clone(),
        title: data.title.clone(),
        skills: data.skills.clone(),
        experience: data.experience.clone(),
        education: data.education.clone(),
        links: data.links.clone(),
        talent_fit_score: data.talent_fit_score,
        score_breakdown: data.score_breakdown.clone(),
        resume_file_name: data.resume_file_name.clone(),
        source: data.source.clone(),
        created_at: chrono::Utc::now().to_string(),
        // GitHub fields will be populated async
        code_characteristics: None,
        ai_detection_score: None,
        ai_proficiency_score: None,
        code_authenticity_score: None,
        ai_analysis_details: None,
        developer_profile: None,
        analysis_metadata: None,
        github_stats: None,
        analysis_status: initial_status.to_string(),
    };

    RawJson(serde_json::to_string(&candidate).unwrap())
}

#[post("/jobs/<job_id>/candidates", data = "<data>")]
pub async fn add_candidate_to_job(job_id: &str, data: json::Json<LinkCandidateToJob>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let id = uuid::Uuid::new_v4();
    let job_uuid = uuid::Uuid::parse_str(job_id).unwrap();
    let candidate_uuid = uuid::Uuid::parse_str(&data.candidate_id).unwrap();

    sqlx::query(
        r#"INSERT INTO job_candidates (id, job_id, candidate_id, job_match_score, team_compatibility_score)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (job_id, candidate_id) DO UPDATE SET
           job_match_score = EXCLUDED.job_match_score,
           team_compatibility_score = EXCLUDED.team_compatibility_score"#
    )
    .bind(id)
    .bind(job_uuid)
    .bind(candidate_uuid)
    .bind(data.job_match_score.unwrap_or(0))
    .bind(data.team_compatibility_score.unwrap_or(0))
    .execute(&mut **db)
    .await
    .unwrap();

    RawJson(format!(r#"{{"success":true,"id":"{}","candidate_id":"{}"}}"#, id, data.candidate_id))
}

#[get("/jobs/<job_id>/candidates")]
pub async fn get_job_candidates(job_id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let job_uuid = uuid::Uuid::parse_str(job_id).unwrap();

    let rows = sqlx::query(
        r#"SELECT jc.id, jc.job_match_score, jc.team_compatibility_score, jc.added_at,
                  sc.id as candidate_id, sc.name, sc.email, sc.phone, sc.location, sc.title,
                  sc.skills, sc.experience, sc.education, sc.links,
                  sc.talent_fit_score, sc.score_breakdown, sc.resume_file_name,
                  sc.source, sc.created_at,
                  sc.code_characteristics, sc.ai_detection_score, sc.ai_proficiency_score,
                  sc.code_authenticity_score, sc.ai_analysis_details, sc.developer_profile,
                  sc.analysis_metadata, sc.github_stats, sc.analysis_status
           FROM job_candidates jc
           JOIN sourced_candidates sc ON jc.candidate_id = sc.id
           WHERE jc.job_id = $1
           ORDER BY jc.added_at DESC"#
    )
    .bind(job_uuid)
    .fetch_all(&mut **db)
    .await
    .unwrap();

    let job_candidates: Vec<JobCandidateRow> = rows
        .into_iter()
        .map(|r| {
            JobCandidateRow {
                id: r.get::<uuid::Uuid, _>("id").to_string(),
                candidate: CandidateRow {
                    id: r.get::<uuid::Uuid, _>("candidate_id").to_string(),
                    name: r.get("name"),
                    email: r.get("email"),
                    phone: r.get("phone"),
                    location: r.get("location"),
                    title: r.get("title"),
                    skills: serde_json::from_value(r.get::<serde_json::Value, _>("skills")).unwrap_or_default(),
                    experience: serde_json::from_value(r.get::<serde_json::Value, _>("experience")).unwrap_or_default(),
                    education: serde_json::from_value(r.get::<serde_json::Value, _>("education")).unwrap_or_default(),
                    links: serde_json::from_value(r.get::<serde_json::Value, _>("links")).unwrap_or_default(),
                    talent_fit_score: r.get::<Option<i32>, _>("talent_fit_score").unwrap_or(0),
                    score_breakdown: serde_json::from_value(r.get::<serde_json::Value, _>("score_breakdown")).unwrap_or_default(),
                    resume_file_name: r.get("resume_file_name"),
                    source: r.get::<Option<String>, _>("source").unwrap_or_else(|| "manual".to_string()),
                    created_at: r.get::<chrono::DateTime<chrono::Utc>, _>("created_at").to_string(),
                    code_characteristics: r.get("code_characteristics"),
                    ai_detection_score: r.get("ai_detection_score"),
                    ai_proficiency_score: r.get("ai_proficiency_score"),
                    code_authenticity_score: r.get("code_authenticity_score"),
                    ai_analysis_details: r.get("ai_analysis_details"),
                    developer_profile: r.get("developer_profile"),
                    analysis_metadata: r.get("analysis_metadata"),
                    github_stats: r.get("github_stats"),
                    analysis_status: r.get::<Option<String>, _>("analysis_status").unwrap_or_else(|| "complete".to_string()),
                },
                job_match_score: r.get::<Option<i32>, _>("job_match_score").unwrap_or(0),
                team_compatibility_score: r.get::<Option<i32>, _>("team_compatibility_score").unwrap_or(0),
                added_at: r.get::<chrono::DateTime<chrono::Utc>, _>("added_at").to_string(),
            }
        })
        .collect();

    RawJson(serde_json::to_string(&job_candidates).unwrap())
}

#[get("/candidates/count")]
pub async fn get_candidates_count(mut db: Connection<MainDatabase>) -> RawJson<String> {
    let row = sqlx::query("SELECT COUNT(*) as count FROM sourced_candidates")
        .fetch_one(&mut **db)
        .await
        .unwrap();

    let count: i64 = row.get("count");
    RawJson(format!(r#"{{"count":{}}}"#, count))
}

#[allow(unused_variables)]
#[delete("/jobs/<job_id>/candidates/<candidate_id>")]
pub async fn remove_candidate_from_job(job_id: &str, candidate_id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let job_uuid = uuid::Uuid::parse_str(job_id).unwrap();
    let candidate_uuid = uuid::Uuid::parse_str(candidate_id).unwrap();

    sqlx::query("DELETE FROM job_candidates WHERE job_id = $1 AND candidate_id = $2")
        .bind(job_uuid)
        .bind(candidate_uuid)
        .execute(&mut **db)
        .await
        .unwrap();

    RawJson(format!(r#"{{"success":true,"job_id":"{}","candidate_id":"{}"}}"#, job_id, candidate_id))
}
