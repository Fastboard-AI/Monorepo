use rocket::{post, response::content::RawJson, serde::json};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct AnalyseRepo<'a> {
    url: &'a str
}

#[post("/analyse_repo", data = "<data>")]
pub async fn analyse_repo<'a>(data: json::Json<AnalyseRepo<'a>>) -> RawJson<String> {
    let result = crate::code_analysis::ai::generate_characteristics_from_repo(&data.0.url)
        .await
        .unwrap();

    let json = serde_json::to_string(&result).unwrap();
    RawJson(json)
}
