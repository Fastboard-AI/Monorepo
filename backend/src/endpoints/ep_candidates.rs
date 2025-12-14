use rocket::{get, post, delete, serde::json};
use rocket_db_pools::Connection;
use rocket::response::content::RawJson;
use serde::{Deserialize, Serialize};
use crate::db::MainDatabase;
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
}

#[derive(Serialize)]
pub struct JobCandidateRow {
    id: String,
    candidate: CandidateRow,
    job_match_score: i32,
    team_compatibility_score: i32,
    added_at: String,
}

#[post("/candidates", data = "<data>")]
pub async fn create_candidate(data: json::Json<CreateCandidate>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let id = uuid::Uuid::new_v4();

    sqlx::query(
        r#"INSERT INTO sourced_candidates
           (id, name, email, phone, location, title, skills, experience, education, links, talent_fit_score, score_breakdown, resume_file_name, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"#
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
    .execute(&mut **db)
    .await
    .unwrap();

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
                  sc.source, sc.created_at
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
                },
                job_match_score: r.get::<Option<i32>, _>("job_match_score").unwrap_or(0),
                team_compatibility_score: r.get::<Option<i32>, _>("team_compatibility_score").unwrap_or(0),
                added_at: r.get::<chrono::DateTime<chrono::Utc>, _>("added_at").to_string(),
            }
        })
        .collect();

    RawJson(serde_json::to_string(&job_candidates).unwrap())
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
