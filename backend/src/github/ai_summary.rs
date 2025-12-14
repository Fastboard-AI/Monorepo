use genai::{
    Client,
    chat::{ChatMessage, ChatOptions, ChatRequest},
};

use crate::github::stats::GitHubStats;
use crate::github::analyze::get_excerpts_for_profile;

const MODEL_GEMINI: &str = "gemini-2.0-flash";

const DEVELOPER_PROFILE_PROMPT: &str = r#"You are analyzing a developer's GitHub profile to understand their personality, coding style, and unique characteristics as a programmer.

Generate a 2-3 paragraph profile that captures WHO this developer is, not just what they can do. Focus on:

**Coding Style & Personality:**
- What patterns reveal about how they think and solve problems
- Their coding "voice" - are they verbose/concise, pragmatic/elegant, experimental/conservative?
- Do they prefer certain paradigms (functional, OOP, etc.)?

**Interests & Passions:**
- What types of projects excite them based on their repos?
- Any niche interests or specializations visible?
- Side projects that show personal curiosity

**Quirks & Characteristics:**
- Unique habits visible in their code or repo organization
- How they name things, structure projects, write commits
- Any distinctive patterns that make their code recognizable

**AI Usage Style:**
The AI analysis scores indicate:
- ai_detection_score: Higher = more AI-assisted code patterns (0-100)
- ai_proficiency_score: Higher = effective AI tool usage (0-100)
- code_authenticity_score: Higher = more personal, human-authored style (0-100)

Interpret these to describe HOW they work with (or without) AI tools.

Write in a warm, observational tone - like you're describing a colleague to someone. Be specific about what the data reveals. Avoid generic statements.

Return ONLY the profile text, no JSON or markdown formatting."#;

const DEVELOPER_PROFILE_WITH_CODE_PROMPT: &str = r#"You are analyzing a developer's GitHub profile AND actual code samples to understand their personality, coding style, and unique characteristics as a programmer.

You have access to:
1. GitHub profile metadata (repos, languages, activity)
2. AI analysis scores for their code
3. ACTUAL CODE EXCERPTS from their repositories, organized by category

Generate a 3-4 paragraph profile that captures WHO this developer is. Use the CODE SAMPLES to make SPECIFIC observations. Focus on:

**Coding Style & Personality:**
- Reference SPECIFIC patterns from the code excerpts (naming conventions, error handling, etc.)
- Their coding "voice" - are they verbose/concise, pragmatic/elegant?
- Quote or describe actual code patterns you see

**Technical Preferences:**
- Based on the code, what paradigms do they prefer?
- How do they structure their error handling? (see error_handling excerpts)
- What does their naming style reveal? (see naming_style excerpts)
- Do they comment heavily or let code speak? (see comments excerpts)

**Interests & Passions:**
- What types of projects excite them?
- Any niche interests visible in their repos or code patterns?

**Quirks & Distinctive Traits:**
- Unique habits visible in the code excerpts
- Any patterns that make their code recognizable
- Particular ways they structure tests, logs, or configs

**AI Usage Style:**
The AI analysis scores indicate:
- ai_detection_score: Higher = more AI-assisted code patterns (0-100)
- ai_proficiency_score: Higher = effective AI tool usage (0-100)
- code_authenticity_score: Higher = more personal, human-authored style (0-100)

BE SPECIFIC. Reference actual code you see. Don't make generic statements - use evidence from the excerpts.

Write in a warm, observational tone - like you're describing a colleague to someone.

Return ONLY the profile text, no JSON or markdown formatting."#;

pub async fn generate_developer_profile(
    stats: &GitHubStats,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.4);

    // Check if we have code excerpts for enhanced profile
    let code_excerpts = get_excerpts_for_profile(stats);

    let (prompt, user_content) = if let Some(excerpts) = code_excerpts {
        // Use enhanced prompt with code excerpts
        let stats_json = serde_json::to_string_pretty(stats)?;
        let content = format!(
            "## GITHUB STATS:\n{}\n\n## CODE EXCERPTS BY CATEGORY:\n{}",
            stats_json, excerpts
        );
        (DEVELOPER_PROFILE_WITH_CODE_PROMPT, content)
    } else {
        // Use basic prompt with just metadata
        let stats_json = serde_json::to_string_pretty(stats)?;
        (DEVELOPER_PROFILE_PROMPT, stats_json)
    };

    let chat_req = ChatRequest::new(vec![
        ChatMessage::system(prompt),
        ChatMessage::user(user_content),
    ]);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let profile = chat_res
        .content
        .joined_texts()
        .ok_or("Failed to get response text")?;

    Ok(profile.trim().to_string())
}

/// Generate a shorter profile summary (1 paragraph)
pub async fn generate_developer_summary(
    stats: &GitHubStats,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.3);

    let stats_json = serde_json::to_string_pretty(stats)?;

    let prompt = r#"Based on this GitHub profile data, write a single paragraph (3-4 sentences) that captures the essence of this developer's coding style and personality. Be specific and avoid generic statements. Focus on what makes them distinctive.

Return ONLY the paragraph, no formatting."#;

    let chat_req = ChatRequest::new(vec![
        ChatMessage::system(prompt),
        ChatMessage::user(stats_json),
    ]);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let summary = chat_res
        .content
        .joined_texts()
        .ok_or("Failed to get response text")?;

    Ok(summary.trim().to_string())
}
