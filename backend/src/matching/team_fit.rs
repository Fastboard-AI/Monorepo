use super::ExplainableScore;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkStyle {
    pub communication: String,
    pub collaboration: String,
    pub pace: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeCharacteristics {
    pub avg_lines_per_function: f32,
    pub functional_vs_oop_ratio: f32,
    pub recursion_vs_loop_ratio: f32,
    pub dependency_coupling_index: f32,
    pub modularity_index_score: f32,
    pub avg_nesting_depth: f32,
    pub abstraction_layer_count: f32,
    pub immutability_score: f32,
    pub error_handling_centralization_score: f32,
    pub test_structure_modularity_ratio: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TeamMemberProfile {
    pub skills: Vec<String>,
    pub experience_level: String,
    pub work_style: Option<WorkStyle>,
    pub code_characteristics: Option<CodeCharacteristics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdealCandidateProfile {
    pub skill_gaps: Vec<String>,
    pub preferred_experience: String,
    pub code_style_target: Option<CodeCharacteristics>,
    pub work_style_fit: Option<WorkStyle>,
}

fn calculate_code_style_distance(a: &CodeCharacteristics, b: &CodeCharacteristics) -> f32 {
    let diffs = [
        (a.functional_vs_oop_ratio - b.functional_vs_oop_ratio).powi(2),
        (a.recursion_vs_loop_ratio - b.recursion_vs_loop_ratio).powi(2),
        (a.dependency_coupling_index - b.dependency_coupling_index).powi(2),
        (a.modularity_index_score - b.modularity_index_score).powi(2),
        (a.immutability_score - b.immutability_score).powi(2),
        (a.error_handling_centralization_score - b.error_handling_centralization_score).powi(2),
        (a.test_structure_modularity_ratio - b.test_structure_modularity_ratio).powi(2),
    ];
    diffs.iter().sum::<f32>().sqrt()
}

fn calculate_work_style_match(candidate: &WorkStyle, team_avg: &WorkStyle) -> f32 {
    let mut score = 0.0;

    if candidate.communication == team_avg.communication {
        score += 40.0;
    } else if candidate.communication == "mixed" || team_avg.communication == "mixed" {
        score += 30.0;
    } else {
        score += 15.0;
    }

    if candidate.collaboration == team_avg.collaboration {
        score += 35.0;
    } else if candidate.collaboration == "balanced" || team_avg.collaboration == "balanced" {
        score += 25.0;
    } else {
        score += 10.0;
    }

    if candidate.pace == team_avg.pace {
        score += 25.0;
    } else if candidate.pace == "flexible" || team_avg.pace == "flexible" {
        score += 20.0;
    } else {
        score += 10.0;
    }

    score
}

pub fn compute_ideal_profile(team_members: &[TeamMemberProfile], all_required_skills: &[String]) -> IdealCandidateProfile {
    let mut team_skills: Vec<String> = team_members.iter()
        .flat_map(|m| m.skills.iter().cloned())
        .collect();
    team_skills.sort();
    team_skills.dedup();

    let skill_gaps: Vec<String> = all_required_skills.iter()
        .filter(|s| !team_skills.iter().any(|ts| ts.to_lowercase() == s.to_lowercase()))
        .cloned()
        .collect();

    let exp_counts: std::collections::HashMap<&str, usize> = team_members.iter()
        .map(|m| m.experience_level.as_str())
        .fold(std::collections::HashMap::new(), |mut acc, e| {
            *acc.entry(e).or_insert(0) += 1;
            acc
        });

    let preferred_experience = if !exp_counts.contains_key("senior") || exp_counts.get("senior").unwrap_or(&0) < &2 {
        "senior".to_string()
    } else if !exp_counts.contains_key("mid") {
        "mid".to_string()
    } else {
        "any".to_string()
    };

    let code_chars: Vec<&CodeCharacteristics> = team_members.iter()
        .filter_map(|m| m.code_characteristics.as_ref())
        .collect();

    let code_style_target = if !code_chars.is_empty() {
        let n = code_chars.len() as f32;
        Some(CodeCharacteristics {
            avg_lines_per_function: code_chars.iter().map(|c| c.avg_lines_per_function).sum::<f32>() / n,
            functional_vs_oop_ratio: code_chars.iter().map(|c| c.functional_vs_oop_ratio).sum::<f32>() / n,
            recursion_vs_loop_ratio: code_chars.iter().map(|c| c.recursion_vs_loop_ratio).sum::<f32>() / n,
            dependency_coupling_index: code_chars.iter().map(|c| c.dependency_coupling_index).sum::<f32>() / n,
            modularity_index_score: code_chars.iter().map(|c| c.modularity_index_score).sum::<f32>() / n,
            avg_nesting_depth: code_chars.iter().map(|c| c.avg_nesting_depth).sum::<f32>() / n,
            abstraction_layer_count: code_chars.iter().map(|c| c.abstraction_layer_count).sum::<f32>() / n,
            immutability_score: code_chars.iter().map(|c| c.immutability_score).sum::<f32>() / n,
            error_handling_centralization_score: code_chars.iter().map(|c| c.error_handling_centralization_score).sum::<f32>() / n,
            test_structure_modularity_ratio: code_chars.iter().map(|c| c.test_structure_modularity_ratio).sum::<f32>() / n,
        })
    } else {
        None
    };

    IdealCandidateProfile {
        skill_gaps,
        preferred_experience,
        code_style_target,
        work_style_fit: None,
    }
}

pub fn calculate_team_fit_score(
    candidate_skills: &[String],
    candidate_work_style: Option<&WorkStyle>,
    candidate_code_style: Option<&CodeCharacteristics>,
    team_members: &[TeamMemberProfile],
    ideal_profile: Option<&IdealCandidateProfile>,
) -> ExplainableScore {
    let mut matched: Vec<String> = Vec::new();
    let mut missing: Vec<String> = Vec::new();
    let mut bonus: Vec<String> = Vec::new();

    if team_members.is_empty() {
        return ExplainableScore {
            score: 75,
            matched: vec!["No existing team to compare against".to_string()],
            missing: vec![],
            bonus: vec![],
            reasoning: Some("Default score for first team member".to_string()),
        };
    }

    let mut score_components: Vec<f32> = Vec::new();

    // Skill complementarity
    if let Some(ideal) = ideal_profile {
        let gaps_filled: Vec<&String> = ideal.skill_gaps.iter()
            .filter(|gap| candidate_skills.iter().any(|s| s.to_lowercase() == gap.to_lowercase()))
            .collect();

        if !gaps_filled.is_empty() {
            let gap_score = (gaps_filled.len() as f32 / ideal.skill_gaps.len().max(1) as f32 * 100.0).min(100.0);
            score_components.push(gap_score);
            for gap in gaps_filled {
                bonus.push(format!("Fills skill gap: {}", gap));
            }
        } else if !ideal.skill_gaps.is_empty() {
            score_components.push(50.0);
            missing.push(format!("Does not fill {} skill gaps", ideal.skill_gaps.len()));
        }
    }

    // Work style compatibility
    if let Some(cand_style) = candidate_work_style {
        let team_styles: Vec<&WorkStyle> = team_members.iter()
            .filter_map(|m| m.work_style.as_ref())
            .collect();

        if !team_styles.is_empty() {
            let avg_score: f32 = team_styles.iter()
                .map(|ts| calculate_work_style_match(cand_style, ts))
                .sum::<f32>() / team_styles.len() as f32;

            score_components.push(avg_score);
            if avg_score >= 80.0 {
                matched.push("Work style aligns well with team".to_string());
            } else if avg_score >= 60.0 {
                matched.push("Work style moderately compatible".to_string());
            } else {
                missing.push("Work style differs from team".to_string());
            }
        }
    }

    // Code style similarity
    if let (Some(cand_code), Some(ideal)) = (candidate_code_style, ideal_profile) {
        if let Some(ref target) = ideal.code_style_target {
            let distance = calculate_code_style_distance(cand_code, target);
            let code_score = ((1.0 - distance / 3.0) * 100.0).max(0.0).min(100.0);
            score_components.push(code_score);

            if code_score >= 80.0 {
                matched.push("Coding style very similar to team".to_string());
            } else if code_score >= 60.0 {
                matched.push("Coding style compatible with team".to_string());
            } else {
                missing.push("Coding style differs from team average".to_string());
            }
        }
    }

    let final_score = if score_components.is_empty() {
        75
    } else {
        (score_components.iter().sum::<f32>() / score_components.len() as f32).round() as i32
    };

    let reasoning = if matched.len() > missing.len() {
        "Good team fit based on style and skills".to_string()
    } else if missing.is_empty() {
        "Moderate team fit".to_string()
    } else {
        "Some compatibility concerns".to_string()
    };

    ExplainableScore {
        score: final_score.min(100).max(0),
        matched,
        missing,
        bonus,
        reasoning: Some(reasoning),
    }
}
