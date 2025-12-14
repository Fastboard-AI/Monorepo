use genai::{
    Client,
    chat::{ChatMessage, ChatOptions, ChatRequest},
};
use serde::{Deserialize, Serialize};

use crate::github::api::{get_all_user_repos, get_readme_content, GitHubRepoFull};

const MODEL_GEMINI: &str = "gemini-2.0-flash";

// ============================================
// Input Structures
// ============================================

/// Repo analysis for project generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepoAnalysis {
    pub name: String,
    pub description: Option<String>,
    pub readme_content: Option<String>,
    pub inferred_purpose: Option<String>,
    pub primary_language: Option<String>,
    pub size: u32,
    pub is_fork: bool,
}

/// Complete candidate context for project generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateContext {
    pub name: String,
    pub claimed_skills: Vec<CandidateSkillContext>,
    pub repos: Vec<RepoAnalysis>,
    pub github_stats: Option<serde_json::Value>,
    pub developer_profile: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateSkillContext {
    pub name: String,
    pub level: String,
}

/// Job context for project generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobContext {
    pub title: String,
    pub description: Option<String>,
    pub required_skills: Vec<RequiredSkillContext>,
    pub experience_level: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RequiredSkillContext {
    pub name: String,
    pub level: Option<String>,
    pub mandatory: bool,
}

// ============================================
// Output Structures
// ============================================

/// Single evaluation criterion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationCriterion {
    pub criterion: String,
    pub weight: i32,
    pub description: String,
}

/// A single take-home project spec
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TakeHomeProject {
    pub id: String,
    pub title: String,
    pub description: String,
    pub skill_focus: Vec<String>,
    pub requirements: Vec<String>,
    pub deliverables: Vec<String>,
    pub evaluation_criteria: Vec<EvaluationCriterion>,
    pub time_estimate_hours: i32,
    pub difficulty: String,
    pub skill_gaps_addressed: Vec<String>,
    pub based_on_repos: Vec<String>,
}

/// Analysis summary for transparency
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisSummary {
    pub repos_analyzed: i32,
    pub readmes_found: i32,
    pub primary_languages: Vec<String>,
    pub skill_match_percentage: i32,
    pub identified_gaps: Vec<String>,
}

/// Complete take-home projects response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TakeHomeProjects {
    pub projects: Vec<TakeHomeProject>,
    pub analysis_summary: AnalysisSummary,
}

// ============================================
// AI Prompts
// ============================================

const REPO_PURPOSE_PROMPT: &str = r#"Given a GitHub repository name and optional description, infer the likely purpose of the project in 1-2 sentences.

Repository name: {repo_name}
Description: {description}

Focus on:
- What problem it likely solves
- What technologies it probably uses
- What type of project it is (library, tool, web app, etc.)

Return ONLY the inference, no markdown formatting."#;

const PROJECT_GENERATION_PROMPT: &str = r#"You are an expert technical interviewer designing take-home coding projects.

Generate 2-3 take-home project options for a candidate applying to a specific job. Each project should:
1. Test skills relevant to the job requirements
2. Be calibrated to the candidate's demonstrated abilities (not too easy, not too hard)
3. Address identified skill gaps while building on strengths
4. Be completable in 4-8 hours

## CANDIDATE PROFILE:
Name: {candidate_name}
Claimed Skills: {claimed_skills}
Developer Profile: {developer_profile}

### GitHub Repository Analysis:
{repos_analysis}

## JOB REQUIREMENTS:
Title: {job_title}
Description: {job_description}
Required Skills: {required_skills}
Experience Level: {experience_level}

## SKILL GAP ANALYSIS:
Matched Skills: {matched_skills}
Missing/Weak Skills: {skill_gaps}

## OUTPUT FORMAT (JSON):
Return a JSON object with this exact structure:
{
  "projects": [
    {
      "title": "Project Title",
      "description": "2-3 paragraph description explaining the project and its real-world relevance",
      "skill_focus": ["skill1", "skill2", "skill3"],
      "requirements": [
        "Specific requirement 1",
        "Specific requirement 2",
        "Specific requirement 3 (at least 4-6 requirements)"
      ],
      "deliverables": [
        "Working application/code",
        "Tests",
        "Documentation",
        "Any other expected outputs"
      ],
      "evaluation_criteria": [
        {"criterion": "Code Quality", "weight": 30, "description": "Clean, readable, well-structured code"},
        {"criterion": "Functionality", "weight": 40, "description": "All requirements implemented correctly"},
        {"criterion": "Testing", "weight": 20, "description": "Meaningful test coverage"},
        {"criterion": "Documentation", "weight": 10, "description": "Clear README and comments"}
      ],
      "time_estimate_hours": 6,
      "difficulty": "intermediate",
      "skill_gaps_addressed": ["gap1", "gap2"],  // Can be empty [] if no gaps
      "based_on_repos": ["repo-name-1", "repo-name-2"]
    }
  ],
  "analysis_summary": {
    "repos_analyzed": 15,
    "readmes_found": 8,
    "primary_languages": ["Rust", "TypeScript"],
    "skill_match_percentage": 75,
    "identified_gaps": ["Redis", "GraphQL"]
  }
}

IMPORTANT:
- ALWAYS generate 2-3 projects regardless of skill gaps or available GitHub data
- Make projects realistic and practical, similar to actual work tasks
- Tailor difficulty based on candidate's experience level and claimed skills
- Include projects that test the candidate's strongest skills
- If skill gaps exist, include at least one project that addresses them
- If NO skill gaps exist, focus on advanced challenges in their strong areas and projects that combine multiple skills
- If GitHub repos are available, base projects on patterns seen in them
- If NO GitHub repos are available, base projects purely on claimed skills and job requirements
- evaluation_criteria weights MUST sum to 100

Return ONLY the JSON object, no additional text or markdown formatting."#;

// ============================================
// Functions
// ============================================

/// Infer repository purpose from name when no README exists
pub async fn infer_repo_purpose(
    repo_name: &str,
    description: Option<&str>,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.3);

    let prompt = REPO_PURPOSE_PROMPT
        .replace("{repo_name}", repo_name)
        .replace("{description}", description.unwrap_or("None provided"));

    let chat_req = ChatRequest::new(vec![
        ChatMessage::user(prompt),
    ]);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let res = chat_res
        .content
        .joined_texts()
        .ok_or("Failed to get response text")?;

    Ok(res.trim().to_string())
}

/// Analyze all repos for a candidate
pub async fn analyze_candidate_repos(
    username: &str,
    token: &str,
) -> Result<Vec<RepoAnalysis>, Box<dyn std::error::Error + Send + Sync>> {
    let repos = get_all_user_repos(username, token).await?;
    let mut analyses = Vec::new();

    // Filter out forks for project generation
    let non_fork_repos: Vec<&GitHubRepoFull> = repos.iter().filter(|r| !r.fork).collect();

    for repo in non_fork_repos {
        // Try to get README
        let readme = get_readme_content(&repo.owner.login, &repo.name, token)
            .await
            .unwrap_or(None);

        // If no README, infer purpose from repo name + description
        let inferred_purpose = if readme.is_none() {
            infer_repo_purpose(&repo.name, repo.description.as_deref())
                .await
                .ok()
        } else {
            None
        };

        analyses.push(RepoAnalysis {
            name: repo.name.clone(),
            description: repo.description.clone(),
            readme_content: readme,
            inferred_purpose,
            primary_language: repo.language.clone(),
            size: repo.size,
            is_fork: repo.fork,
        });

        // Rate limit protection
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    Ok(analyses)
}

/// Generate take-home projects for a candidate-job pair
pub async fn generate_take_home_projects(
    candidate: &CandidateContext,
    job: &JobContext,
) -> Result<TakeHomeProjects, Box<dyn std::error::Error + Send + Sync>> {
    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.4);

    // Analyze skill gaps
    let (matched, gaps) = analyze_skill_gaps(&candidate.claimed_skills, &job.required_skills);

    // Format repos for prompt (limit to 30 for prompt size)
    let repos_analysis = format_repos_for_prompt(&candidate.repos);

    // Build prompt
    let prompt = PROJECT_GENERATION_PROMPT
        .replace("{candidate_name}", &candidate.name)
        .replace("{claimed_skills}", &format_skills(&candidate.claimed_skills))
        .replace("{developer_profile}", candidate.developer_profile.as_deref().unwrap_or("Not available"))
        .replace("{repos_analysis}", &repos_analysis)
        .replace("{job_title}", &job.title)
        .replace("{job_description}", job.description.as_deref().unwrap_or("Not provided"))
        .replace("{required_skills}", &format_required_skills(&job.required_skills))
        .replace("{experience_level}", &job.experience_level)
        .replace("{matched_skills}", &matched.join(", "))
        .replace("{skill_gaps}", &if gaps.is_empty() { "None identified".to_string() } else { gaps.join(", ") });

    let chat_req = ChatRequest::new(vec![
        ChatMessage::user(prompt),
    ]);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let response = chat_res
        .content
        .joined_texts()
        .ok_or("No response from AI")?;

    let json_str = extract_json(&response);

    let mut projects: TakeHomeProjects = serde_json::from_str(&json_str)
        .map_err(|e| format!("Failed to parse AI response: {}. Raw: {}", e, json_str))?;

    // Add UUIDs to each project
    for project in &mut projects.projects {
        project.id = uuid::Uuid::new_v4().to_string();
    }

    Ok(projects)
}

// ============================================
// Helper Functions
// ============================================

fn format_repos_for_prompt(repos: &[RepoAnalysis]) -> String {
    if repos.is_empty() {
        return "No GitHub repositories available. Generate projects based on claimed skills and job requirements only.".to_string();
    }

    repos.iter()
        .take(30)
        .map(|r| {
            let content = r.readme_content.as_ref()
                .map(|c| {
                    let truncated: String = c.chars().take(500).collect();
                    format!("README excerpt: {}", truncated)
                })
                .or_else(|| r.inferred_purpose.as_ref().map(|p| format!("Inferred purpose: {}", p)))
                .unwrap_or_else(|| "No description available".to_string());

            format!(
                "- {} [{}]: {}\n  {}",
                r.name,
                r.primary_language.as_deref().unwrap_or("Unknown"),
                r.description.as_deref().unwrap_or("No description"),
                content
            )
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn format_skills(skills: &[CandidateSkillContext]) -> String {
    skills.iter()
        .map(|s| format!("{} ({})", s.name, s.level))
        .collect::<Vec<_>>()
        .join(", ")
}

fn format_required_skills(skills: &[RequiredSkillContext]) -> String {
    skills.iter()
        .map(|s| {
            let level = s.level.as_deref().unwrap_or("any");
            let mandatory = if s.mandatory { "required" } else { "nice-to-have" };
            format!("{} ({}, {})", s.name, level, mandatory)
        })
        .collect::<Vec<_>>()
        .join(", ")
}

fn analyze_skill_gaps(
    candidate_skills: &[CandidateSkillContext],
    required_skills: &[RequiredSkillContext],
) -> (Vec<String>, Vec<String>) {
    let mut matched = Vec::new();
    let mut gaps = Vec::new();

    for req in required_skills {
        let found = candidate_skills.iter().any(|cs| {
            skills_match_simple(&cs.name, &req.name)
        });

        if found {
            matched.push(req.name.clone());
        } else {
            gaps.push(req.name.clone());
        }
    }

    (matched, gaps)
}

fn skills_match_simple(candidate_skill: &str, required_skill: &str) -> bool {
    let c = candidate_skill.to_lowercase();
    let r = required_skill.to_lowercase();

    if c == r {
        return true;
    }

    // Simple synonym matching
    let synonyms = [
        ("javascript", "js"),
        ("typescript", "ts"),
        ("python", "py"),
        ("postgresql", "postgres"),
        ("kubernetes", "k8s"),
        ("react", "reactjs"),
        ("node", "nodejs"),
    ];

    for (a, b) in synonyms {
        if (c == a && r == b) || (c == b && r == a) {
            return true;
        }
    }

    // Partial match
    c.contains(&r) || r.contains(&c)
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
