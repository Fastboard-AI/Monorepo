use rocket::{get, post, put, delete, serde::json};
use rocket_db_pools::Connection;
use rocket::response::content::RawJson;
use serde::{Deserialize, Serialize};
use crate::db::MainDatabase;
use crate::matching::RequiredSkill;
use sqlx::Row;

/// Parse required_skills from JSONB - supports both legacy and enhanced formats
/// Legacy: ["Python", "React"]
/// Enhanced: [{"name": "Python", "level": "advanced", "mandatory": true}]
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

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct CreateJob {
    title: String,
    description: Option<String>,
    location: Option<String>,
    required_skills: serde_json::Value,  // Accept both formats
    experience_level: String,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct UpdateJob {
    title: Option<String>,
    description: Option<String>,
    location: Option<String>,
    required_skills: Option<serde_json::Value>,  // Accept both formats
    experience_level: Option<String>,
    status: Option<String>,
    team_id: Option<String>,
}

#[derive(Serialize)]
struct JobRow {
    id: String,
    title: String,
    description: Option<String>,
    location: Option<String>,
    required_skills: Vec<RequiredSkill>,  // Always return enhanced format
    experience_level: String,
    status: String,
    team_id: Option<String>,
    candidate_ids: Vec<String>,
    created_at: String,
    updated_at: String,
}

#[get("/jobs")]
pub async fn get_jobs(mut db: Connection<MainDatabase>) -> RawJson<String> {
    let rows = sqlx::query(
        r#"SELECT id, title, description, location, required_skills, experience_level, status, team_id, created_at, updated_at FROM jobs ORDER BY created_at DESC"#
    )
    .fetch_all(&mut **db)
    .await
    .unwrap();

    let jobs: Vec<JobRow> = rows
        .into_iter()
        .map(|r| {
            let skills_json: serde_json::Value = r.get("required_skills");
            JobRow {
                id: r.get::<uuid::Uuid, _>("id").to_string(),
                title: r.get("title"),
                description: r.get("description"),
                location: r.get("location"),
                required_skills: parse_required_skills(&skills_json),
                experience_level: r.get::<Option<String>, _>("experience_level").unwrap_or_else(|| "any".to_string()),
                status: r.get::<Option<String>, _>("status").unwrap_or_else(|| "sourcing".to_string()),
                team_id: r.get::<Option<uuid::Uuid>, _>("team_id").map(|id| id.to_string()),
                candidate_ids: vec![],
                created_at: r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|t| t.to_string()).unwrap_or_default(),
                updated_at: r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at").map(|t| t.to_string()).unwrap_or_default(),
            }
        })
        .collect();

    RawJson(serde_json::to_string(&jobs).unwrap())
}

#[get("/jobs/<id>")]
pub async fn get_job(id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let uuid = uuid::Uuid::parse_str(id).unwrap();

    let row = sqlx::query(
        r#"SELECT id, title, description, location, required_skills, experience_level, status, team_id, created_at, updated_at FROM jobs WHERE id = $1"#
    )
    .bind(uuid)
    .fetch_one(&mut **db)
    .await
    .unwrap();

    let skills_json: serde_json::Value = row.get("required_skills");
    let job = JobRow {
        id: row.get::<uuid::Uuid, _>("id").to_string(),
        title: row.get("title"),
        description: row.get("description"),
        location: row.get("location"),
        required_skills: parse_required_skills(&skills_json),
        experience_level: row.get::<Option<String>, _>("experience_level").unwrap_or_else(|| "any".to_string()),
        status: row.get::<Option<String>, _>("status").unwrap_or_else(|| "sourcing".to_string()),
        team_id: row.get::<Option<uuid::Uuid>, _>("team_id").map(|id| id.to_string()),
        candidate_ids: vec![],
        created_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|t| t.to_string()).unwrap_or_default(),
        updated_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at").map(|t| t.to_string()).unwrap_or_default(),
    };

    RawJson(serde_json::to_string(&job).unwrap())
}

#[post("/jobs", data = "<data>")]
pub async fn create_job(data: json::Json<CreateJob>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let id = uuid::Uuid::new_v4();

    sqlx::query(
        r#"INSERT INTO jobs (id, title, description, location, required_skills, experience_level) VALUES ($1, $2, $3, $4, $5, $6)"#
    )
    .bind(id)
    .bind(&data.title)
    .bind(&data.description)
    .bind(&data.location)
    .bind(&data.required_skills)
    .bind(&data.experience_level)
    .execute(&mut **db)
    .await
    .unwrap();

    let job = JobRow {
        id: id.to_string(),
        title: data.title.clone(),
        description: data.description.clone(),
        location: data.location.clone(),
        required_skills: parse_required_skills(&data.required_skills),
        experience_level: data.experience_level.clone(),
        status: "sourcing".to_string(),
        team_id: None,
        candidate_ids: vec![],
        created_at: chrono::Utc::now().to_string(),
        updated_at: chrono::Utc::now().to_string(),
    };

    RawJson(serde_json::to_string(&job).unwrap())
}

#[put("/jobs/<id>", data = "<data>")]
pub async fn update_job(id: &str, data: json::Json<UpdateJob>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let uuid = uuid::Uuid::parse_str(id).unwrap();

    if let Some(ref title) = data.title {
        sqlx::query("UPDATE jobs SET title = $1, updated_at = NOW() WHERE id = $2")
            .bind(title)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref description) = data.description {
        sqlx::query("UPDATE jobs SET description = $1, updated_at = NOW() WHERE id = $2")
            .bind(description)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref location) = data.location {
        sqlx::query("UPDATE jobs SET location = $1, updated_at = NOW() WHERE id = $2")
            .bind(location)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref skills) = data.required_skills {
        sqlx::query("UPDATE jobs SET required_skills = $1, updated_at = NOW() WHERE id = $2")
            .bind(skills)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref level) = data.experience_level {
        sqlx::query("UPDATE jobs SET experience_level = $1, updated_at = NOW() WHERE id = $2")
            .bind(level)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref status) = data.status {
        sqlx::query("UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2")
            .bind(status)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref team_id) = data.team_id {
        let team_uuid = if team_id.is_empty() { None } else { Some(uuid::Uuid::parse_str(team_id).unwrap()) };
        sqlx::query("UPDATE jobs SET team_id = $1, updated_at = NOW() WHERE id = $2")
            .bind(team_uuid)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }

    RawJson(format!(r#"{{"success":true,"id":"{}"}}"#, id))
}

#[delete("/jobs/<id>")]
pub async fn delete_job(id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let uuid = uuid::Uuid::parse_str(id).unwrap();

    sqlx::query("DELETE FROM jobs WHERE id = $1")
        .bind(uuid)
        .execute(&mut **db)
        .await
        .unwrap();

    RawJson(format!(r#"{{"success":true,"id":"{}"}}"#, id))
}
