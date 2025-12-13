use rocket::{post, serde::json};
use rocket_db_pools::{Connection, sqlx};
use serde::Deserialize;

use crate::db::MainDatabase;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct AddToDb<'a> {
    most_popular_repo: &'a str,
    github: &'a str,
    name: &'a str,
    degrees: Vec<String>,
    stacks: Vec<String>,
    email: &'a str,
    employed: bool
}

#[post("/add_to_db", data = "<data>")]
pub async fn add_to_db<'a>(data: json::Json<AddToDb<'a>>, mut db: Connection<MainDatabase>) {
    let result = crate::code_analysis::ai::generate_characteristics_from_repo(&data.0.most_popular_repo)
        .await
        .unwrap();

    sqlx::query("INSERT INTO candidates (name, degrees, style, github, email, stacks, employed) VALUES ($1, $2, $3, $4, $5, $6, $7)")
        .bind(data.name)
        .bind(sqlx::types::Json(data.degrees.clone()))
        .bind(sqlx::types::Json(result))
        .bind(data.github)
        .bind(data.email)
        .bind(sqlx::types::Json(data.stacks.clone()))
        .bind(data.employed)
        .execute(&mut **db).await
        .unwrap();
}
