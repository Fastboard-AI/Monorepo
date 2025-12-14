use rocket::{get, post};
use rocket::response::content::RawJson;
use rocket_db_pools::Connection;

use crate::db::MainDatabase;
use crate::github::analyze::{analyze_github_user, analyze_github_user_deep};
use crate::github::ai_summary::generate_developer_profile;

/// Analyze a GitHub user and return full stats with AI analysis (basic mode)
#[post("/github/analyze/<username>")]
pub async fn analyze_github(username: &str) -> RawJson<String> {
    let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

    if token.is_empty() {
        return RawJson(r#"{"error": "GitHub token not configured"}"#.to_string());
    }

    match analyze_github_user(username, &token).await {
        Ok(stats) => {
            RawJson(serde_json::to_string(&stats).unwrap_or_else(|_| {
                r#"{"error": "Failed to serialize response"}"#.to_string()
            }))
        }
        Err(e) => {
            RawJson(format!(r#"{{"error": "Analysis failed: {}"}}"#, e))
        }
    }
}

/// Deep analyze a GitHub user using embeddings (requires DB)
#[post("/github/analyze/<username>/deep")]
pub async fn analyze_github_deep(
    mut db: Connection<MainDatabase>,
    username: &str,
) -> RawJson<String> {
    let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

    if token.is_empty() {
        return RawJson(r#"{"error": "GitHub token not configured"}"#.to_string());
    }

    match analyze_github_user_deep(&mut *db, username, &token).await {
        Ok(stats) => {
            RawJson(serde_json::to_string(&stats).unwrap_or_else(|_| {
                r#"{"error": "Failed to serialize response"}"#.to_string()
            }))
        }
        Err(e) => {
            RawJson(format!(r#"{{"error": "Deep analysis failed: {}"}}"#, e))
        }
    }
}

/// Get AI-generated developer profile (coding style, personality, quirks)
#[get("/github/profile/<username>")]
pub async fn get_github_profile(username: &str) -> RawJson<String> {
    let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

    if token.is_empty() {
        return RawJson(r#"{"error": "GitHub token not configured"}"#.to_string());
    }

    // First get the stats
    let stats = match analyze_github_user(username, &token).await {
        Ok(s) => s,
        Err(e) => {
            return RawJson(format!(r#"{{"error": "Analysis failed: {}"}}"#, e));
        }
    };

    // Then generate developer profile
    match generate_developer_profile(&stats).await {
        Ok(profile) => {
            RawJson(serde_json::json!({
                "username": username,
                "profile": profile
            }).to_string())
        }
        Err(e) => {
            RawJson(format!(r#"{{"error": "Profile generation failed: {}"}}"#, e))
        }
    }
}

/// Get deep AI-generated developer profile with code excerpts
#[get("/github/profile/<username>/deep")]
pub async fn get_github_profile_deep(
    mut db: Connection<MainDatabase>,
    username: &str,
) -> RawJson<String> {
    let token = std::env::var("GITHUB_TOKEN").unwrap_or_default();

    if token.is_empty() {
        return RawJson(r#"{"error": "GitHub token not configured"}"#.to_string());
    }

    // Get deep stats with code excerpts
    let stats = match analyze_github_user_deep(&mut *db, username, &token).await {
        Ok(s) => s,
        Err(e) => {
            return RawJson(format!(r#"{{"error": "Deep analysis failed: {}"}}"#, e));
        }
    };

    // Generate developer profile with code excerpts
    match generate_developer_profile(&stats).await {
        Ok(profile) => {
            RawJson(serde_json::json!({
                "username": username,
                "profile": profile,
                "analysis_metadata": stats.analysis_metadata
            }).to_string())
        }
        Err(e) => {
            RawJson(format!(r#"{{"error": "Profile generation failed: {}"}}"#, e))
        }
    }
}
