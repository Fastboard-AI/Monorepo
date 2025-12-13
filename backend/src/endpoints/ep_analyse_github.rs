use rocket::{post, response::content::RawJson, serde::json};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(crate = "rocket::serde")]
pub struct AnalyseGitHub<'a> {
    username: &'a str,
}

#[post("/analyse_github", data = "<data>")]
pub async fn analyse_github<'a>(data: json::Json<AnalyseGitHub<'a>>) -> RawJson<String> {
    let token = std::env::var("GITHUB_TOKEN").unwrap();

    let result = crate::code_analysis::ai::generate_characteristics_from_github(
        &data.0.username,
        &token,
    )
    .await
    .unwrap();

    let json = serde_json::to_string(&result).unwrap();
    RawJson(json)
}
