use genai::{
    Client,
    chat::{ChatMessage, ChatOptions, ChatRequest},
};
use serde::Deserialize;

use crate::github::stats::{AIAnalysis, AnalysisDetails};

const MODEL_GEMINI: &str = "gemini-2.0-flash";

const AI_ANALYSIS_PROMPT: &str = r#"You are an expert code analyst specializing in detecting AI-generated code patterns.

Analyze the provided code samples and return a JSON object with the following structure:

{
  "ai_detection_score": <number 0-100>,
  "ai_proficiency_score": <number 0-100>,
  "code_authenticity_score": <number 0-100>,
  "analysis_details": {
    "patterns_detected": [<list of string observations>],
    "confidence": <number 0-1>,
    "reasoning": "<brief explanation>"
  }
}

Scoring Guidelines:

1. ai_detection_score (0-100): Likelihood that code was AI-generated
   HIGH SCORE indicators (AI-generated):
   - Overly consistent formatting across all files
   - Generic, textbook-style variable/function names (e.g., "processData", "handleClick")
   - Excessive boilerplate and defensive coding
   - Perfect but impersonal error handling
   - Comments that over-explain obvious code
   - Lack of personal coding style
   - Unusually comprehensive documentation
   - Code that reads like tutorial examples

   LOW SCORE indicators (Human-written):
   - Personal naming conventions and quirks
   - Inconsistent but purposeful style choices
   - Domain-specific shortcuts
   - Commented-out debug code or TODOs
   - Organic code evolution visible in structure

2. ai_proficiency_score (0-100): How effectively they use AI tools
   HIGH SCORE indicators:
   - Appropriate use of AI for boilerplate generation
   - Good integration of AI suggestions with custom logic
   - Evidence of human review and refinement of AI output
   - Smart delegation of repetitive tasks to AI

   LOW SCORE indicators:
   - Raw, unedited AI output
   - No evidence of AI assistance (not necessarily bad)
   - Poor integration of AI-generated code

3. code_authenticity_score (0-100): Human authorship and originality
   HIGH SCORE indicators:
   - Personal coding quirks and style preferences
   - Inconsistencies that suggest organic development
   - Domain-specific optimizations
   - Opinionated architectural decisions
   - Clear code style evolution
   - Evidence of iterative development

   LOW SCORE indicators:
   - Code appears copy-pasted from tutorials
   - No personal style visible
   - Generic implementations for everything

Return ONLY the JSON object, no additional text or markdown formatting."#;

#[derive(Deserialize)]
struct AIAnalysisResponse {
    ai_detection_score: f32,
    ai_proficiency_score: f32,
    code_authenticity_score: f32,
    analysis_details: AnalysisDetailsResponse,
}

#[derive(Deserialize)]
struct AnalysisDetailsResponse {
    patterns_detected: Vec<String>,
    confidence: f32,
    reasoning: String,
}

pub async fn analyze_code_for_ai_usage(
    code_samples: &str,
) -> Result<AIAnalysis, Box<dyn std::error::Error + Send + Sync>> {
    if code_samples.trim().is_empty() {
        return Ok(AIAnalysis::default());
    }

    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.0);

    let chat_req = ChatRequest::new(vec![
        ChatMessage::system(AI_ANALYSIS_PROMPT),
        ChatMessage::user(code_samples.to_string()),
    ]);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let res = chat_res
        .content
        .joined_texts()
        .ok_or("Failed to get response text")?;

    // Parse JSON response (handle potential markdown code blocks)
    let json_str = extract_json(&res);

    let response: AIAnalysisResponse = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse AI analysis response: {}. Raw: {}", e, json_str))?;

    Ok(AIAnalysis {
        ai_detection_score: response.ai_detection_score.clamp(0.0, 100.0),
        ai_proficiency_score: response.ai_proficiency_score.clamp(0.0, 100.0),
        code_authenticity_score: response.code_authenticity_score.clamp(0.0, 100.0),
        analysis_details: AnalysisDetails {
            patterns_detected: response.analysis_details.patterns_detected,
            confidence: response.analysis_details.confidence.clamp(0.0, 1.0),
            reasoning: response.analysis_details.reasoning,
        },
    })
}

fn extract_json(response: &str) -> String {
    let lines: Vec<&str> = response.lines().collect();

    // Handle markdown code blocks
    if lines.len() > 2 && lines[0].contains("```") {
        return lines[1..lines.len()-1].join("\n");
    }

    // Try to find JSON object boundaries
    if let Some(start) = response.find('{') {
        if let Some(end) = response.rfind('}') {
            return response[start..=end].to_string();
        }
    }

    response.to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_json_plain() {
        let input = r#"{"ai_detection_score": 50}"#;
        assert_eq!(extract_json(input), input);
    }

    #[test]
    fn test_extract_json_with_code_block() {
        let input = "```json\n{\"ai_detection_score\": 50}\n```";
        assert_eq!(extract_json(input), "{\"ai_detection_score\": 50}");
    }
}
