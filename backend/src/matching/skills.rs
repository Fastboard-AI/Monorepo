use super::{CandidateSkill, RequiredSkill, ExplainableScore};
use std::collections::HashMap;
use genai::chat::{ChatMessage, ChatRequest};
use genai::Client;
use serde::Deserialize;

#[derive(Deserialize)]
struct AISkillAnalysis {
    score: i32,
    reasoning: String,
    strengths: Vec<String>,
    gaps: Vec<String>,
}

const AI_SKILL_PROMPT: &str = r#"You are a technical recruiter evaluating candidate-job fit.

Compare the candidate's skills and experience against the job requirements.

Scoring guide:
- 90-100: Matches most required skills, strong relevant experience
- 70-89: Matches many required skills, good experience fit
- 50-69: Matches some skills, partial experience fit
- 30-49: Few matching skills, limited relevance
- 0-29: Almost no skill overlap

Consider:
- Direct skill matches (e.g., Python to Python)
- Equivalent skills (e.g., Vue.js is similar to React, MySQL is similar to PostgreSQL)
- Years of relevant experience
- Similar job roles/responsibilities

Be generous with equivalent technologies. A senior developer with 8 years experience and overlapping skills should score 70+.

Respond with JSON only:
{
  "score": 0-100,
  "reasoning": "Brief explanation of the match",
  "strengths": ["matching skill or experience 1", "matching skill or experience 2"],
  "gaps": ["missing requirement 1"]
}
"#;

fn level_weight(level: &str) -> f32 {
    match level.to_lowercase().as_str() {
        "expert" => 1.0,
        "advanced" => 0.8,
        "proficient" => 0.7,
        "intermediate" => 0.6,
        "familiar" => 0.5,
        "beginner" => 0.4,
        _ => 0.5,
    }
}

fn get_synonyms() -> HashMap<&'static str, Vec<&'static str>> {
    let mut map = HashMap::new();
    map.insert("javascript", vec!["js", "ecmascript", "es6"]);
    map.insert("typescript", vec!["ts"]);
    map.insert("python", vec!["py", "python3"]);
    map.insert("postgresql", vec!["postgres", "psql", "pgsql"]);
    map.insert("mongodb", vec!["mongo"]);
    map.insert("kubernetes", vec!["k8s"]);
    map.insert("react", vec!["reactjs", "react js"]);
    map.insert("node", vec!["nodejs", "node js"]);
    map.insert("graphql", vec!["gql"]);
    map.insert("machine learning", vec!["ml"]);
    map.insert("amazon web services", vec!["aws"]);
    map.insert("google cloud platform", vec!["gcp"]);
    map
}

fn normalize_skill(name: &str) -> String {
    name.to_lowercase().replace("-", " ").replace("_", " ").trim().to_string()
}

fn skills_match(candidate_skill: &str, required_skill: &str) -> Option<(String, f32)> {
    let candidate_norm = normalize_skill(candidate_skill);
    let required_norm = normalize_skill(required_skill);
    
    if candidate_norm == required_norm {
        return Some(("exact".to_string(), 1.0));
    }
    
    let synonyms = get_synonyms();
    for (canonical, syns) in &synonyms {
        let all_variants: Vec<&str> = std::iter::once(*canonical).chain(syns.iter().copied()).collect();
        let candidate_matches = all_variants.iter().any(|v| normalize_skill(v) == candidate_norm);
        let required_matches = all_variants.iter().any(|v| normalize_skill(v) == required_norm);
        if candidate_matches && required_matches {
            return Some(("synonym".to_string(), 0.95));
        }
    }
    
    let distance = strsim::levenshtein(&candidate_norm, &required_norm);
    let max_len = candidate_norm.len().max(required_norm.len());
    if max_len > 0 {
        let similarity = 1.0 - (distance as f32 / max_len as f32);
        if similarity >= 0.8 {
            return Some(("fuzzy".to_string(), similarity * 0.9));
        }
    }
    
    if candidate_norm.contains(&required_norm) || required_norm.contains(&candidate_norm) {
        return Some(("partial".to_string(), 0.7));
    }
    
    None
}

pub fn calculate_skill_score(
    candidate_skills: &[CandidateSkill],
    required_skills: &[RequiredSkill],
) -> ExplainableScore {
    if required_skills.is_empty() {
        return ExplainableScore {
            score: 100,
            matched: vec![],
            missing: vec![],
            bonus: vec![],
            reasoning: Some("No skills required".to_string()),
        };
    }
    
    let mut matched: Vec<String> = Vec::new();
    let mut missing: Vec<String> = Vec::new();
    let mut bonus: Vec<String> = Vec::new();
    let mut total_score = 0.0;
    let mut total_weight = 0.0;
    let mut used: Vec<bool> = vec![false; candidate_skills.len()];
    
    for req in required_skills {
        let is_mandatory = req.mandatory.unwrap_or(true);
        let req_level = req.level.as_deref().unwrap_or("intermediate");
        let weight = if is_mandatory { 1.0 } else { 0.5 };
        
        let mut best: Option<(usize, String, f32)> = None;
        for (i, cand) in candidate_skills.iter().enumerate() {
            if used[i] { continue; }
            if let Some((mtype, mscore)) = skills_match(&cand.name, &req.name) {
                let cand_w = level_weight(&cand.level);
                let req_w = level_weight(req_level);
                let level_score = if cand_w >= req_w {
                    1.0 - ((cand_w - req_w) * 0.25)
                } else {
                    cand_w / req_w
                };
                let combined = mscore * level_score;
                if best.is_none() || combined > best.as_ref().unwrap().2 {
                    best = Some((i, mtype, combined));
                }
            }
        }
        
        if let Some((i, mtype, score)) = best {
            used[i] = true;
            matched.push(format!("{} ({}) - {}", candidate_skills[i].name, candidate_skills[i].level, mtype));
            total_score += score * weight;
        } else {
            if is_mandatory {
                missing.push(format!("{} ({})", req.name, req_level));
            } else {
                missing.push(format!("{} (nice-to-have)", req.name));
            }
        }
        total_weight += weight;
    }
    
    for (i, cand) in candidate_skills.iter().enumerate() {
        if !used[i] {
            let norm = normalize_skill(&cand.name);
            let keywords = ["rust", "go", "python", "typescript", "react", "aws", "docker", "kubernetes"];
            if keywords.iter().any(|k| norm.contains(k)) {
                bonus.push(format!("{} ({})", cand.name, cand.level));
            }
        }
    }
    
    let base = if total_weight > 0.0 { (total_score / total_weight * 100.0).round() as i32 } else { 100 };
    let bonus_pts = (bonus.len() as i32 * 2).min(5);
    let final_score = (base + bonus_pts).min(100).max(0);
    
    let mandatory_missing = missing.iter().filter(|m| !m.contains("nice-to-have")).count();
    let reasoning = if mandatory_missing > 0 {
        format!("Missing {} mandatory skill(s)", mandatory_missing)
    } else if missing.is_empty() {
        "Excellent skill match!".to_string()
    } else {
        format!("Good match, missing {} nice-to-have", missing.len())
    };
    
    ExplainableScore { score: final_score, matched, missing, bonus, reasoning: Some(reasoning) }
}

async fn calculate_ai_skill_match(
    candidate_description: &str,
    job_info: &str,
) -> ExplainableScore {
    if candidate_description.is_empty() || job_info.is_empty() {
        return ExplainableScore {
            score: 70,
            matched: vec![],
            missing: vec![],
            bonus: vec![],
            reasoning: Some("Insufficient data for AI skill analysis".to_string()),
        };
    }

    let context = format!(
        "CANDIDATE:\n{}\n\nJOB:\n{}",
        candidate_description, job_info
    );

    match analyze_skills_with_gemini(&context).await {
        Ok(analysis) => ExplainableScore {
            score: analysis.score.min(100).max(0),
            matched: analysis.strengths,
            missing: analysis.gaps,
            bonus: vec![],
            reasoning: Some(analysis.reasoning),
        },
        Err(_) => ExplainableScore {
            score: 70,
            matched: vec![],
            missing: vec![],
            bonus: vec![],
            reasoning: Some("AI skill analysis unavailable".to_string()),
        },
    }
}

async fn analyze_skills_with_gemini(context: &str) -> Result<AISkillAnalysis, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();
    let prompt = format!("{}\n\n{}", AI_SKILL_PROMPT, context);
    let request = ChatRequest::new(vec![ChatMessage::user(prompt)]);

    let response = client
        .exec_chat("gemini-2.0-flash", request, None)
        .await?;

    let content = response
        .first_text()
        .ok_or("No response content")?;

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

    let analysis: AISkillAnalysis = serde_json::from_str(json_str.trim())?;
    Ok(analysis)
}

/// Combined skill scoring: 90% AI + 10% algorithmic
pub async fn calculate_combined_skill_score(
    candidate_skills: &[CandidateSkill],
    required_skills: &[RequiredSkill],
    candidate_description: &str,
    job_info: &str,
) -> ExplainableScore {
    let algo_score = calculate_skill_score(candidate_skills, required_skills);
    let ai_score = calculate_ai_skill_match(candidate_description, job_info).await;

    let combined = ((ai_score.score as f32 * 0.9) + (algo_score.score as f32 * 0.1)).round() as i32;

    let mut matched = ai_score.matched;
    matched.extend(algo_score.matched.into_iter().map(|s| format!("[Algo] {}", s)));

    let mut missing = ai_score.missing;
    missing.extend(algo_score.missing.into_iter().map(|s| format!("[Algo] {}", s)));

    let reasoning = format!(
        "AI: {} | Algo: {}",
        ai_score.reasoning.unwrap_or_default(),
        algo_score.reasoning.unwrap_or_default()
    );

    ExplainableScore {
        score: combined.min(100).max(0),
        matched,
        missing,
        bonus: algo_score.bonus,
        reasoning: Some(reasoning),
    }
}
