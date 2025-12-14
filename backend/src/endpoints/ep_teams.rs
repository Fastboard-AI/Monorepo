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
            r#"SELECT id, name, role, skills, experience_level, work_style FROM team_members WHERE team_id = $1"#
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
        r#"SELECT id, name, role, skills, experience_level, work_style FROM team_members WHERE team_id = $1"#
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
        r#"INSERT INTO team_members (id, team_id, name, role, skills, experience_level, work_style) VALUES ($1, $2, $3, $4, $5, $6, $7)"#
    )
    .bind(id)
    .bind(team_uuid)
    .bind(data.name)
    .bind(data.role)
    .bind(serde_json::to_value(&data.skills).unwrap())
    .bind(data.experience_level)
    .bind(serde_json::to_value(&data.work_style).unwrap())
    .execute(&mut **db)
    .await
    .unwrap();

    let member = TeamMemberRow {
        id: id.to_string(),
        name: data.name.to_string(),
        role: data.role.to_string(),
        skills: data.skills.clone(),
        experience_level: data.experience_level.to_string(),
        work_style: data.work_style.clone(),
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
