use super::ExplainableScore;
use genai::chat::{ChatMessage, ChatRequest};
use genai::Client;
use serde::Deserialize;

#[derive(Deserialize)]
struct CultureAnalysis {
    score: i32,
    reasoning: String,
    strengths: Vec<String>,
    concerns: Vec<String>,
}

const CULTURE_PROMPT: &str = r#"You are analyzing culture fit between a candidate and a job/team.

Evaluate based on:
1. Communication style alignment
2. Work approach compatibility
3. Values and priorities match
4. Collaboration preferences

Respond with JSON only:
{
  "score": 0-100,
  "reasoning": "Brief explanation",
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1"]
}
"#;

pub async fn calculate_culture_score(
    candidate_profile: Option<&str>,
    job_description: Option<&str>,
    team_profiles: &[String],
) -> ExplainableScore {
    // If no data available, return neutral score
    if candidate_profile.is_none() && job_description.is_none() && team_profiles.is_empty() {
        return ExplainableScore {
            score: 70,
            matched: vec![],
            missing: vec![],
            bonus: vec![],
            reasoning: Some("Insufficient data for culture analysis".to_string()),
        };
    }

    // Build context for AI
    let mut context = String::new();

    if let Some(profile) = candidate_profile {
        context.push_str(&format!("CANDIDATE PROFILE:\n{}\n\n", profile));
    }

    if let Some(desc) = job_description {
        context.push_str(&format!("JOB DESCRIPTION:\n{}\n\n", desc));
    }

    if !team_profiles.is_empty() {
        context.push_str("TEAM MEMBER PROFILES:\n");
        for (i, profile) in team_profiles.iter().enumerate() {
            context.push_str(&format!("{}. {}\n", i + 1, profile));
        }
    }

    // Try AI analysis
    match analyze_with_gemini(&context).await {
        Ok(analysis) => ExplainableScore {
            score: analysis.score.min(100).max(0),
            matched: analysis.strengths,
            missing: analysis.concerns,
            bonus: vec![],
            reasoning: Some(analysis.reasoning),
        },
        Err(_) => {
            // Fallback to heuristic scoring
            calculate_heuristic_culture_score(candidate_profile, job_description)
        }
    }
}

async fn analyze_with_gemini(context: &str) -> Result<CultureAnalysis, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();

    let prompt = format!("{}\n\nContext:\n{}", CULTURE_PROMPT, context);

    let request = ChatRequest::new(vec![ChatMessage::user(prompt)]);

    let response = client
        .exec_chat("gemini-2.0-flash", request, None)
        .await?;

    let content = response
        .first_text()
        .ok_or("No response content")?;

    // Extract JSON from response
    let json_str = if content.contains("```json") {
        content
            .split("```json")
            .nth(1)
            .and_then(|s| s.split("```").next())
            .unwrap_or(content)
    } else if content.contains("```") {
        content
            .split("```")
            .nth(1)
            .unwrap_or(content)
    } else {
        content
    };

    let analysis: CultureAnalysis = serde_json::from_str(json_str.trim())?;
    Ok(analysis)
}

fn calculate_heuristic_culture_score(
    candidate_profile: Option<&str>,
    job_description: Option<&str>,
) -> ExplainableScore {
    let mut score = 70;
    let mut matched: Vec<String> = Vec::new();
    let mut missing: Vec<String> = Vec::new();

    // Simple keyword matching as fallback
    if let (Some(profile), Some(job)) = (candidate_profile, job_description) {
        let profile_lower = profile.to_lowercase();
        let job_lower = job.to_lowercase();

        // Positive keywords
        let positive_keywords = [
            ("collaborative", "Values collaboration"),
            ("team player", "Team-oriented"),
            ("communication", "Strong communicator"),
            ("agile", "Familiar with agile"),
            ("mentor", "Mentorship experience"),
            ("leadership", "Leadership qualities"),
        ];

        for (keyword, description) in positive_keywords {
            if profile_lower.contains(keyword) && job_lower.contains(keyword) {
                score += 5;
                matched.push(description.to_string());
            }
        }

        // Check for potential mismatches
        if profile_lower.contains("independent") && job_lower.contains("collaborative") {
            score -= 5;
            missing.push("Work style may differ (independent vs collaborative)".to_string());
        }

        if profile_lower.contains("fast-paced") && job_lower.contains("steady") {
            score -= 3;
            missing.push("Pace preference may differ".to_string());
        }
    }

    ExplainableScore {
        score: score.min(100).max(0),
        matched,
        missing,
        bonus: vec![],
        reasoning: Some("Heuristic culture analysis (AI unavailable)".to_string()),
    }
}
