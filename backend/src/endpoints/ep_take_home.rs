use rocket::{post, get, serde::json};
use rocket_db_pools::Connection;
use rocket::response::content::RawJson;
use serde::Deserialize;
use crate::db::MainDatabase;
use crate::github::take_home::{
    generate_take_home_projects, analyze_candidate_repos,
    CandidateContext, JobContext, TakeHomeProjects,
    CandidateSkillContext, RequiredSkillContext,
};
use sqlx::Row;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct GenerateProjectsRequest {
    force_regenerate: Option<bool>,
}

/// Extract GitHub username from a GitHub URL
fn extract_github_username(url: &str) -> Option<String> {
    let url = url.trim().trim_end_matches('/');

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

fn parse_required_skills_context(json: &serde_json::Value) -> Vec<RequiredSkillContext> {
    match json.as_array() {
        Some(arr) => arr.iter().filter_map(|item| {
            if let Some(s) = item.as_str() {
                Some(RequiredSkillContext {
                    name: s.to_string(),
                    level: Some("intermediate".to_string()),
                    mandatory: true,
                })
            } else if item.is_object() {
                Some(RequiredSkillContext {
                    name: item.get("name")?.as_str()?.to_string(),
                    level: item.get("level").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    mandatory: item.get("mandatory").and_then(|v| v.as_bool()).unwrap_or(true),
                })
            } else {
                None
            }
        }).collect(),
        None => vec![],
    }
}

fn parse_candidate_skills(json: &serde_json::Value) -> Vec<CandidateSkillContext> {
    match json.as_array() {
        Some(arr) => arr.iter().filter_map(|item| {
            Some(CandidateSkillContext {
                name: item.get("name")?.as_str()?.to_string(),
                level: item.get("level").and_then(|v| v.as_str()).unwrap_or("intermediate").to_string(),
            })
        }).collect(),
        None => vec![],
    }
}

/// Generate take-home projects for a candidate linked to a job
/// POST /api/jobs/{job_id}/candidates/{candidate_id}/take-home-projects
#[post("/jobs/<job_id>/candidates/<candidate_id>/take-home-projects", data = "<data>")]
pub async fn generate_take_home(
    job_id: &str,
    candidate_id: &str,
    data: Option<json::Json<GenerateProjectsRequest>>,
    mut db: Connection<MainDatabase>,
) -> RawJson<String> {
    let job_uuid = match uuid::Uuid::parse_str(job_id) {
        Ok(u) => u,
        Err(_) => return RawJson(r#"{"error": "Invalid job ID"}"#.to_string()),
    };
    let candidate_uuid = match uuid::Uuid::parse_str(candidate_id) {
        Ok(u) => u,
        Err(_) => return RawJson(r#"{"error": "Invalid candidate ID"}"#.to_string()),
    };
    let force = data.map(|d| d.force_regenerate.unwrap_or(false)).unwrap_or(false);

    // Check if projects already exist (unless force regenerate)
    if !force {
        let existing = sqlx::query(
            "SELECT take_home_projects FROM job_candidates WHERE job_id = $1 AND candidate_id = $2"
        )
        .bind(job_uuid)
        .bind(candidate_uuid)
        .fetch_optional(&mut **db)
        .await;

        if let Ok(Some(row)) = existing {
            let projects: Option<serde_json::Value> = row.get("take_home_projects");
            if let Some(p) = projects {
                return RawJson(serde_json::to_string(&p).unwrap());
            }
        }
    }

    // Fetch job details
    let job_row = match sqlx::query(
        "SELECT title, description, required_skills, experience_level FROM jobs WHERE id = $1"
    )
    .bind(job_uuid)
    .fetch_optional(&mut **db)
    .await {
        Ok(Some(row)) => row,
        Ok(None) => return RawJson(r#"{"error": "Job not found"}"#.to_string()),
        Err(e) => return RawJson(format!(r#"{{"error": "Database error: {}"}}"#, e)),
    };

    let job_context = JobContext {
        title: job_row.get("title"),
        description: job_row.get("description"),
        required_skills: parse_required_skills_context(&job_row.get::<serde_json::Value, _>("required_skills")),
        experience_level: job_row.get::<Option<String>, _>("experience_level").unwrap_or_else(|| "intermediate".to_string()),
    };

    // Fetch candidate details
    let candidate_row = match sqlx::query(
        "SELECT name, skills, links, github_stats, developer_profile FROM sourced_candidates WHERE id = $1"
    )
    .bind(candidate_uuid)
    .fetch_optional(&mut **db)
    .await {
        Ok(Some(row)) => row,
        Ok(None) => return RawJson(r#"{"error": "Candidate not found"}"#.to_string()),
        Err(e) => return RawJson(format!(r#"{{"error": "Database error: {}"}}"#, e)),
    };

    // Verify candidate is linked to job
    let link_check = sqlx::query(
        "SELECT id FROM job_candidates WHERE job_id = $1 AND candidate_id = $2"
    )
    .bind(job_uuid)
    .bind(candidate_uuid)
    .fetch_optional(&mut **db)
    .await;

    if let Ok(None) = link_check {
        return RawJson(r#"{"error": "Candidate is not linked to this job"}"#.to_string());
    }

    let links: serde_json::Value = candidate_row.get("links");
    let github_url = links.get("github").and_then(|v| v.as_str()).filter(|s| !s.is_empty());

    // Try to analyze GitHub repos if available, but don't fail if not
    let repos = if let Some(url) = github_url {
        if let Some(username) = extract_github_username(url) {
            let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();
            if !token.is_empty() {
                analyze_candidate_repos(&username, &token).await.unwrap_or_default()
            } else {
                vec![]
            }
        } else {
            vec![]
        }
    } else {
        vec![]
    };

    let candidate_context = CandidateContext {
        name: candidate_row.get("name"),
        claimed_skills: parse_candidate_skills(&candidate_row.get::<serde_json::Value, _>("skills")),
        repos,
        github_stats: candidate_row.get("github_stats"),
        developer_profile: candidate_row.get("developer_profile"),
    };

    // Generate projects
    let projects: TakeHomeProjects = match generate_take_home_projects(&candidate_context, &job_context).await {
        Ok(p) => p,
        Err(e) => return RawJson(format!(r#"{{"error": "Failed to generate projects: {}"}}"#, e)),
    };

    // Store in database
    let projects_json = serde_json::to_value(&projects).unwrap();
    let _ = sqlx::query(
        "UPDATE job_candidates SET take_home_projects = $1, projects_generated_at = NOW() WHERE job_id = $2 AND candidate_id = $3"
    )
    .bind(&projects_json)
    .bind(job_uuid)
    .bind(candidate_uuid)
    .execute(&mut **db)
    .await;

    RawJson(serde_json::to_string(&projects).unwrap())
}

/// Get existing take-home projects for a candidate-job pair
/// GET /api/jobs/{job_id}/candidates/{candidate_id}/take-home-projects
#[get("/jobs/<job_id>/candidates/<candidate_id>/take-home-projects")]
pub async fn get_take_home(
    job_id: &str,
    candidate_id: &str,
    mut db: Connection<MainDatabase>,
) -> RawJson<String> {
    let job_uuid = match uuid::Uuid::parse_str(job_id) {
        Ok(u) => u,
        Err(_) => return RawJson(r#"{"error": "Invalid job ID"}"#.to_string()),
    };
    let candidate_uuid = match uuid::Uuid::parse_str(candidate_id) {
        Ok(u) => u,
        Err(_) => return RawJson(r#"{"error": "Invalid candidate ID"}"#.to_string()),
    };

    let row = sqlx::query(
        "SELECT take_home_projects, projects_generated_at FROM job_candidates WHERE job_id = $1 AND candidate_id = $2"
    )
    .bind(job_uuid)
    .bind(candidate_uuid)
    .fetch_optional(&mut **db)
    .await;

    match row {
        Ok(Some(r)) => {
            let projects: Option<serde_json::Value> = r.get("take_home_projects");
            let generated_at: Option<chrono::DateTime<chrono::Utc>> = r.get("projects_generated_at");
            match projects {
                Some(p) => {
                    let mut response = p.clone();
                    if let Some(obj) = response.as_object_mut() {
                        obj.insert("generated_at".to_string(), serde_json::json!(generated_at.map(|t| t.to_string())));
                    }
                    RawJson(serde_json::to_string(&response).unwrap())
                },
                None => RawJson(r#"{"projects": null, "message": "No projects generated yet"}"#.to_string()),
            }
        }
        Ok(None) => RawJson(r#"{"error": "Candidate not linked to this job"}"#.to_string()),
        Err(e) => RawJson(format!(r#"{{"error": "Database error: {}"}}"#, e)),
    }
}
