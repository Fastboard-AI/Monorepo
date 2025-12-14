use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::github::semantic_search::SearchResults;

#[derive(Serialize, Deserialize, Clone)]
pub struct GitHubProfile {
    pub name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: String,
    pub public_repos: u32,
    pub followers: u32,
    pub following: u32,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct RepositoryInfo {
    pub name: String,
    pub description: Option<String>,
    pub language: Option<String>,
    pub is_fork: bool,
    pub size: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AIAnalysis {
    pub ai_detection_score: f32,
    pub ai_proficiency_score: f32,
    pub code_authenticity_score: f32,
    pub analysis_details: AnalysisDetails,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AnalysisDetails {
    pub patterns_detected: Vec<String>,
    pub confidence: f32,
    pub reasoning: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct AnalysisMetadata {
    pub chunks_analyzed: u32,
    pub total_lines: u32,
    pub repos_analyzed: u32,
    pub languages_detected: Vec<String>,
}

impl Default for AnalysisMetadata {
    fn default() -> Self {
        Self {
            chunks_analyzed: 0,
            total_lines: 0,
            repos_analyzed: 0,
            languages_detected: vec![],
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct GitHubStats {
    pub username: String,
    pub profile: GitHubProfile,
    pub repositories: Vec<RepositoryInfo>,
    pub ai_analysis: AIAnalysis,
    pub languages: HashMap<String, u32>,
    pub analyzed_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code_excerpts: Option<SearchResults>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub analysis_metadata: Option<AnalysisMetadata>,
}

impl Default for AIAnalysis {
    fn default() -> Self {
        Self {
            ai_detection_score: 0.0,
            ai_proficiency_score: 0.0,
            code_authenticity_score: 0.0,
            analysis_details: AnalysisDetails::default(),
        }
    }
}

impl Default for AnalysisDetails {
    fn default() -> Self {
        Self {
            patterns_detected: vec![],
            confidence: 0.0,
            reasoning: String::new(),
        }
    }
}
