pub mod skills;
pub mod experience;
pub mod team_fit;
pub mod culture;

use serde::{Deserialize, Serialize};

/// Required skill with level and mandatory flag
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequiredSkill {
    pub name: String,
    pub level: Option<String>,      // "beginner", "intermediate", "advanced", "expert"
    pub mandatory: Option<bool>,    // true = required, false = nice-to-have
}

/// Candidate skill with proficiency level
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateSkill {
    pub name: String,
    pub level: String,  // "beginner", "intermediate", "advanced", "expert"
}

/// Candidate experience entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateExperience {
    pub title: String,
    pub company: String,
    pub duration: String,
    pub description: Option<String>,
}

/// Explainable score with reasoning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExplainableScore {
    pub score: i32,
    pub matched: Vec<String>,
    pub missing: Vec<String>,
    pub bonus: Vec<String>,
    pub reasoning: Option<String>,
}

/// Complete talent fit score with breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TalentFitScore {
    pub total: i32,
    pub breakdown: ScoreBreakdown,
}

/// Score breakdown by component
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub skills: ExplainableScore,
    pub experience: ExplainableScore,
    pub team_fit: ExplainableScore,
    pub culture: ExplainableScore,
}

/// Weights for score components (must sum to 1.0)
#[derive(Debug, Clone)]
pub struct ScoreWeights {
    pub skills: f32,        // Default: 0.40
    pub experience: f32,    // Default: 0.30
    pub team_fit: f32,      // Default: 0.20
    pub culture: f32,       // Default: 0.10
}

impl Default for ScoreWeights {
    fn default() -> Self {
        Self {
            skills: 0.40,
            experience: 0.30,
            team_fit: 0.20,
            culture: 0.10,
        }
    }
}

/// Calculate aggregate talent fit score
pub fn calculate_talent_fit(
    skills_score: ExplainableScore,
    experience_score: ExplainableScore,
    team_fit_score: ExplainableScore,
    culture_score: ExplainableScore,
    weights: Option<ScoreWeights>,
) -> TalentFitScore {
    let w = weights.unwrap_or_default();
    
    let total = (
        skills_score.score as f32 * w.skills +
        experience_score.score as f32 * w.experience +
        team_fit_score.score as f32 * w.team_fit +
        culture_score.score as f32 * w.culture
    ).round() as i32;
    
    TalentFitScore {
        total: total.min(100).max(0),
        breakdown: ScoreBreakdown {
            skills: skills_score,
            experience: experience_score,
            team_fit: team_fit_score,
            culture: culture_score,
        },
    }
}
