use std::sync::Mutex;

use rocket_db_pools::{Database, sqlx};

use crate::code_analysis::characteristics::CodeCharacteristics;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct InMemoryDatabase {
    pub candidates: Mutex<Vec<Candidate>>
}

#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct Candidate {
    pub name: String,
    pub github: String,
    pub uuid: u128,
    pub age: usize,
    pub style: CodeCharacteristics,
    pub degree: String,
    pub stacks: Vec<String>
}

impl InMemoryDatabase {
    pub fn new() -> InMemoryDatabase {
        Self { candidates: Mutex::new(Vec::new()) }
    }
}

#[derive(Database)]
#[database("main")]
pub struct MainDatabase(sqlx::PgPool);