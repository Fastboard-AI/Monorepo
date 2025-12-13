use std::{error::Error, fs::File, io::{Read, Write}};

use backend::db::{Candidate, Database};
use dotenv::dotenv;
use rocket::{State, post, response::content::RawJson, routes, serde::json};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
struct AnalyseRepo<'a> {
    url: &'a str
}

#[post("/analyse_repo", data = "<data>")]
async fn analyse_repo<'a>(data: json::Json<AnalyseRepo<'a>>) -> RawJson<String> {
    let result = backend::code_analysis::ai::generate_characteristics_from_repo(&data.0.url)
        .await
        .unwrap();

    let json = serde_json::to_string(&result).unwrap();
    RawJson(json)
}

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
struct AddToDb<'a> {
    most_popular_repo: &'a str,
    github: &'a str,
    name: &'a str,
    age: usize,
    degree: &'a str,
    stacks: Vec<String>
}

#[post("/add_to_db", data = "<data>")]
async fn add_to_db<'a>(data: json::Json<AddToDb<'a>>, state: &State<Database>) {
    let result = backend::code_analysis::ai::generate_characteristics_from_repo(&data.0.most_popular_repo)
        .await
        .unwrap();

    state.candidates.lock().unwrap().push(Candidate {
        name: data.name.to_string(),
        github: data.github.to_string(),
        uuid: Uuid::new_v4().as_u128(),
        age: data.age,
        degree: data.degree.to_string(),
        style: result,
        stacks: data.stacks.clone()
    });
}

#[rocket::main]
async fn main() -> Result<(), Box<dyn Error>> {
    dotenv()?;

    let st: Database = if let Ok(mut f) = File::open("saved_state.json") {
        let mut st_json = String::new();
        f.read_to_string(&mut st_json)?;
        serde_json::from_str(&st_json)?
    } else {
        Database::new()
    };

    let server = rocket::build()
        .manage(st)
        .mount("/", routes![analyse_repo, add_to_db])
        .launch()
        .await?;

    let state = server.state::<Database>().unwrap();

    let mut f = File::create("saved_state.json")?;

    f.write(&serde_json::to_string(state)?.as_bytes()).unwrap();

    Ok(())
}