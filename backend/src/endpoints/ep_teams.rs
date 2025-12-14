use rocket::{get, post, put, delete, serde::json};
use rocket_db_pools::Connection;
use rocket::response::content::RawJson;
use serde::{Deserialize, Serialize};
use crate::db::MainDatabase;
use sqlx::Row;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct CreateTeam<'a> {
    name: &'a str,
    target_role: Option<&'a str>,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct UpdateTeam<'a> {
    name: Option<&'a str>,
    target_role: Option<&'a str>,
    compatibility_score: Option<i32>,
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct CreateTeamMember<'a> {
    name: &'a str,
    role: &'a str,
    skills: Vec<Skill>,
    experience_level: &'a str,
    work_style: WorkStyle,
    github: Option<&'a str>,
    linkedin: Option<&'a str>,
    website: Option<&'a str>,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(crate = "rocket::serde")]
pub struct Skill {
    name: String,
    level: String,
}

#[derive(Deserialize, Serialize, Clone)]
#[serde(crate = "rocket::serde")]
pub struct WorkStyle {
    communication: String,
    collaboration: String,
    pace: String,
}

#[derive(Serialize)]
struct TeamMemberRow {
    id: String,
    name: String,
    role: String,
    skills: Vec<Skill>,
    experience_level: String,
    work_style: WorkStyle,
    github: Option<String>,
    linkedin: Option<String>,
    website: Option<String>,
    code_characteristics: Option<serde_json::Value>,
}

#[derive(Serialize)]
struct TeamRow {
    id: String,
    name: String,
    target_role: Option<String>,
    compatibility_score: i32,
    members: Vec<TeamMemberRow>,
    created_at: String,
    updated_at: String,
}

#[get("/teams")]
pub async fn get_teams(mut db: Connection<MainDatabase>) -> RawJson<String> {
    let rows = sqlx::query(
        r#"SELECT id, name, target_role, compatibility_score, created_at, updated_at FROM teams ORDER BY created_at DESC"#
    )
    .fetch_all(&mut **db)
    .await
    .unwrap();

    let mut teams: Vec<TeamRow> = Vec::new();

    for r in rows {
        let team_id: uuid::Uuid = r.get("id");

        let members_rows = sqlx::query(
            r#"SELECT id, name, role, skills, experience_level, work_style, github, linkedin, website, code_characteristics FROM team_members WHERE team_id = $1"#
        )
        .bind(team_id)
        .fetch_all(&mut **db)
        .await
        .unwrap();

        let members: Vec<TeamMemberRow> = members_rows
            .into_iter()
            .map(|m| {
                let skills_json: Option<serde_json::Value> = m.get("skills");
                let work_style_json: Option<serde_json::Value> = m.get("work_style");
                TeamMemberRow {
                    id: m.get::<uuid::Uuid, _>("id").to_string(),
                    name: m.get("name"),
                    role: m.get("role"),
                    skills: serde_json::from_value(skills_json.unwrap_or(serde_json::json!([]))).unwrap_or_default(),
                    experience_level: m.get::<Option<String>, _>("experience_level").unwrap_or_else(|| "mid".to_string()),
                    work_style: serde_json::from_value(work_style_json.unwrap_or(serde_json::json!({"communication":"mixed","collaboration":"balanced","pace":"steady"}))).unwrap_or(WorkStyle {
                        communication: "mixed".to_string(),
                        collaboration: "balanced".to_string(),
                        pace: "steady".to_string(),
                    }),
                    github: m.get("github"),
                    linkedin: m.get("linkedin"),
                    website: m.get("website"),
                    code_characteristics: m.get("code_characteristics"),
                }
            })
            .collect();

        teams.push(TeamRow {
            id: team_id.to_string(),
            name: r.get("name"),
            target_role: r.get("target_role"),
            compatibility_score: r.get::<Option<i32>, _>("compatibility_score").unwrap_or(75),
            members,
            created_at: r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|t| t.to_string()).unwrap_or_default(),
            updated_at: r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at").map(|t| t.to_string()).unwrap_or_default(),
        });
    }

    RawJson(serde_json::to_string(&teams).unwrap())
}

#[get("/teams/<id>")]
pub async fn get_team(id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let uuid = uuid::Uuid::parse_str(id).unwrap();

    let row = sqlx::query(
        r#"SELECT id, name, target_role, compatibility_score, created_at, updated_at FROM teams WHERE id = $1"#
    )
    .bind(uuid)
    .fetch_one(&mut **db)
    .await
    .unwrap();

    let members_rows = sqlx::query(
        r#"SELECT id, name, role, skills, experience_level, work_style, github, linkedin, website, code_characteristics FROM team_members WHERE team_id = $1"#
    )
    .bind(uuid)
    .fetch_all(&mut **db)
    .await
    .unwrap();

    let members: Vec<TeamMemberRow> = members_rows
        .into_iter()
        .map(|m| {
            let skills_json: Option<serde_json::Value> = m.get("skills");
            let work_style_json: Option<serde_json::Value> = m.get("work_style");
            TeamMemberRow {
                id: m.get::<uuid::Uuid, _>("id").to_string(),
                name: m.get("name"),
                role: m.get("role"),
                skills: serde_json::from_value(skills_json.unwrap_or(serde_json::json!([]))).unwrap_or_default(),
                experience_level: m.get::<Option<String>, _>("experience_level").unwrap_or_else(|| "mid".to_string()),
                work_style: serde_json::from_value(work_style_json.unwrap_or(serde_json::json!({"communication":"mixed","collaboration":"balanced","pace":"steady"}))).unwrap_or(WorkStyle {
                    communication: "mixed".to_string(),
                    collaboration: "balanced".to_string(),
                    pace: "steady".to_string(),
                }),
                github: m.get("github"),
                linkedin: m.get("linkedin"),
                website: m.get("website"),
                code_characteristics: m.get("code_characteristics"),
            }
        })
        .collect();

    let team = TeamRow {
        id: row.get::<uuid::Uuid, _>("id").to_string(),
        name: row.get("name"),
        target_role: row.get("target_role"),
        compatibility_score: row.get::<Option<i32>, _>("compatibility_score").unwrap_or(75),
        members,
        created_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("created_at").map(|t| t.to_string()).unwrap_or_default(),
        updated_at: row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("updated_at").map(|t| t.to_string()).unwrap_or_default(),
    };

    RawJson(serde_json::to_string(&team).unwrap())
}

#[post("/teams", data = "<data>")]
pub async fn create_team<'a>(data: json::Json<CreateTeam<'a>>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let id = uuid::Uuid::new_v4();

    sqlx::query(
        r#"INSERT INTO teams (id, name, target_role) VALUES ($1, $2, $3)"#
    )
    .bind(id)
    .bind(data.name)
    .bind(data.target_role)
    .execute(&mut **db)
    .await
    .unwrap();

    let team = TeamRow {
        id: id.to_string(),
        name: data.name.to_string(),
        target_role: data.target_role.map(String::from),
        compatibility_score: 75,
        members: vec![],
        created_at: chrono::Utc::now().to_string(),
        updated_at: chrono::Utc::now().to_string(),
    };

    RawJson(serde_json::to_string(&team).unwrap())
}

#[put("/teams/<id>", data = "<data>")]
pub async fn update_team<'a>(id: &str, data: json::Json<UpdateTeam<'a>>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let uuid = uuid::Uuid::parse_str(id).unwrap();

    if let Some(name) = data.name {
        sqlx::query("UPDATE teams SET name = $1, updated_at = NOW() WHERE id = $2")
            .bind(name)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(target_role) = data.target_role {
        sqlx::query("UPDATE teams SET target_role = $1, updated_at = NOW() WHERE id = $2")
            .bind(target_role)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(score) = data.compatibility_score {
        sqlx::query("UPDATE teams SET compatibility_score = $1, updated_at = NOW() WHERE id = $2")
            .bind(score)
            .bind(uuid)
            .execute(&mut **db).await.unwrap();
    }

    RawJson(format!(r#"{{"success":true,"id":"{}"}}"#, id))
}

#[delete("/teams/<id>")]
pub async fn delete_team(id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let uuid = uuid::Uuid::parse_str(id).unwrap();

    sqlx::query("DELETE FROM teams WHERE id = $1")
        .bind(uuid)
        .execute(&mut **db)
        .await
        .unwrap();

    RawJson(format!(r#"{{"success":true,"id":"{}"}}"#, id))
}

#[post("/teams/<team_id>/members", data = "<data>")]
pub async fn add_team_member<'a>(team_id: &str, data: json::Json<CreateTeamMember<'a>>, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let id = uuid::Uuid::new_v4();
    let team_uuid = uuid::Uuid::parse_str(team_id).unwrap();

    sqlx::query(
        r#"INSERT INTO team_members (id, team_id, name, role, skills, experience_level, work_style, github, linkedin, website) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)"#
    )
    .bind(id)
    .bind(team_uuid)
    .bind(data.name)
    .bind(data.role)
    .bind(serde_json::to_value(&data.skills).unwrap())
    .bind(data.experience_level)
    .bind(serde_json::to_value(&data.work_style).unwrap())
    .bind(data.github)
    .bind(data.linkedin)
    .bind(data.website)
    .execute(&mut **db)
    .await
    .unwrap();

    // Spawn background task for code analysis if GitHub is provided
    if let Some(github) = data.github {
        let github = github.to_string();
        let member_id = id.to_string();
        let db_url = std::env::var("DATABASE_URL").unwrap_or_default();
        let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

        if !db_url.is_empty() && !token.is_empty() {
            tokio::spawn(async move {
                // Get code characteristics - use .ok() to drop non-Send error immediately
                let chars = crate::code_analysis::ai::generate_characteristics_from_github(&github, &token)
                    .await
                    .ok();

                if let Some(chars) = chars {
                    if let Ok(pool) = sqlx::PgPool::connect(&db_url).await {
                        let member_uuid = uuid::Uuid::parse_str(&member_id).unwrap();
                        let _ = sqlx::query("UPDATE team_members SET code_characteristics = $1 WHERE id = $2")
                            .bind(serde_json::to_value(&chars).unwrap())
                            .bind(member_uuid)
                            .execute(&pool)
                            .await;
                    }
                }
            });
        }
    }

    let member = TeamMemberRow {
        id: id.to_string(),
        name: data.name.to_string(),
        role: data.role.to_string(),
        skills: data.skills.clone(),
        experience_level: data.experience_level.to_string(),
        work_style: data.work_style.clone(),
        github: data.github.map(String::from),
        linkedin: data.linkedin.map(String::from),
        website: data.website.map(String::from),
        code_characteristics: None, // Will be populated async
    };

    RawJson(serde_json::to_string(&member).unwrap())
}

#[allow(unused_variables)]
#[delete("/teams/<team_id>/members/<member_id>")]
pub async fn remove_team_member(team_id: &str, member_id: &str, mut db: Connection<MainDatabase>) -> RawJson<String> {
    let member_uuid = uuid::Uuid::parse_str(member_id).unwrap();

    sqlx::query("DELETE FROM team_members WHERE id = $1")
        .bind(member_uuid)
        .execute(&mut **db)
        .await
        .unwrap();

    RawJson(format!(r#"{{"success":true,"id":"{}"}}"#, member_id))
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct UpdateTeamMember<'a> {
    name: Option<&'a str>,
    role: Option<&'a str>,
    skills: Option<Vec<Skill>>,
    experience_level: Option<&'a str>,
    work_style: Option<WorkStyle>,
    github: Option<&'a str>,
    linkedin: Option<&'a str>,
    website: Option<&'a str>,
}

#[allow(unused_variables)]
#[put("/teams/<team_id>/members/<member_id>", data = "<data>")]
pub async fn update_team_member<'a>(
    team_id: &str,
    member_id: &str,
    data: json::Json<UpdateTeamMember<'a>>,
    mut db: Connection<MainDatabase>
) -> RawJson<String> {
    let member_uuid = uuid::Uuid::parse_str(member_id).unwrap();

    // Build dynamic update query
    if let Some(name) = data.name {
        sqlx::query("UPDATE team_members SET name = $1 WHERE id = $2")
            .bind(name)
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(role) = data.role {
        sqlx::query("UPDATE team_members SET role = $1 WHERE id = $2")
            .bind(role)
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref skills) = data.skills {
        sqlx::query("UPDATE team_members SET skills = $1 WHERE id = $2")
            .bind(serde_json::to_value(skills).unwrap())
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(experience_level) = data.experience_level {
        sqlx::query("UPDATE team_members SET experience_level = $1 WHERE id = $2")
            .bind(experience_level)
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(ref work_style) = data.work_style {
        sqlx::query("UPDATE team_members SET work_style = $1 WHERE id = $2")
            .bind(serde_json::to_value(work_style).unwrap())
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(github) = data.github {
        let github_val = if github.is_empty() { None } else { Some(github) };
        sqlx::query("UPDATE team_members SET github = $1 WHERE id = $2")
            .bind(github_val)
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();

        // Trigger background code analysis if GitHub changed
        if let Some(gh) = github_val {
            let gh = gh.to_string();
            let mid = member_id.to_string();
            let db_url = std::env::var("DATABASE_URL").unwrap_or_default();
            let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

            if !db_url.is_empty() && !token.is_empty() {
                tokio::spawn(async move {
                    let chars = crate::code_analysis::ai::generate_characteristics_from_github(&gh, &token)
                        .await
                        .ok();

                    if let Some(chars) = chars {
                        if let Ok(pool) = sqlx::PgPool::connect(&db_url).await {
                            let muuid = uuid::Uuid::parse_str(&mid).unwrap();
                            let _ = sqlx::query("UPDATE team_members SET code_characteristics = $1 WHERE id = $2")
                                .bind(serde_json::to_value(&chars).unwrap())
                                .bind(muuid)
                                .execute(&pool)
                                .await;
                        }
                    }
                });
            }
        }
    }
    if let Some(linkedin) = data.linkedin {
        let linkedin_val = if linkedin.is_empty() { None } else { Some(linkedin) };
        sqlx::query("UPDATE team_members SET linkedin = $1 WHERE id = $2")
            .bind(linkedin_val)
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }
    if let Some(website) = data.website {
        let website_val = if website.is_empty() { None } else { Some(website) };
        sqlx::query("UPDATE team_members SET website = $1 WHERE id = $2")
            .bind(website_val)
            .bind(member_uuid)
            .execute(&mut **db).await.unwrap();
    }

    // Fetch and return updated member
    let row = sqlx::query(
        r#"SELECT id, name, role, skills, experience_level, work_style, github, linkedin, website, code_characteristics FROM team_members WHERE id = $1"#
    )
    .bind(member_uuid)
    .fetch_one(&mut **db)
    .await
    .unwrap();

    let skills_json: Option<serde_json::Value> = row.get("skills");
    let work_style_json: Option<serde_json::Value> = row.get("work_style");

    let member = TeamMemberRow {
        id: row.get::<uuid::Uuid, _>("id").to_string(),
        name: row.get("name"),
        role: row.get("role"),
        skills: serde_json::from_value(skills_json.unwrap_or(serde_json::json!([]))).unwrap_or_default(),
        experience_level: row.get::<Option<String>, _>("experience_level").unwrap_or_else(|| "mid".to_string()),
        work_style: serde_json::from_value(work_style_json.unwrap_or(serde_json::json!({"communication":"mixed","collaboration":"balanced","pace":"steady"}))).unwrap_or(WorkStyle {
            communication: "mixed".to_string(),
            collaboration: "balanced".to_string(),
            pace: "steady".to_string(),
        }),
        github: row.get("github"),
        linkedin: row.get("linkedin"),
        website: row.get("website"),
        code_characteristics: row.get("code_characteristics"),
    };

    RawJson(serde_json::to_string(&member).unwrap())
}
