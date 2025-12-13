use std::sync::Mutex;

use crate::code_analysis::characteristics::CodeCharacteristics;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Database {
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

impl Database {
    pub fn new() -> Database {
        Self { candidates: Mutex::new(Vec::new()) }
    }
}

impl Candidate {

}