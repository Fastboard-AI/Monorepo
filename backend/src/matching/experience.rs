use super::{CandidateExperience, ExplainableScore};

fn parse_duration(duration: &str) -> f32 {
    let lower = duration.to_lowercase();
    let mut years = 0.0;
    
    // Extract numbers from patterns like "2 years", "18 months", "1.5 years"
    let parts: Vec<&str> = lower.split_whitespace().collect();
    for (i, part) in parts.iter().enumerate() {
        if let Ok(num) = part.parse::<f32>() {
            if i + 1 < parts.len() {
                let unit = parts[i + 1];
                if unit.starts_with("year") {
                    years += num;
                } else if unit.starts_with("month") {
                    years += num / 12.0;
                }
            } else {
                years += num;
            }
        }
    }
    
    // Handle patterns like "2019-2022"
    if years == 0.0 && lower.contains("-") {
        let dates: Vec<&str> = lower.split("-").collect();
        if dates.len() == 2 {
            if let (Ok(start), Ok(end)) = (
                dates[0].trim().parse::<i32>(),
                dates[1].trim().parse::<i32>()
            ) {
                if start > 1900 && end > 1900 {
                    years = (end - start).max(0) as f32;
                }
            }
        }
    }
    
    years.max(0.5) // Minimum 6 months if we found something
}

fn level_years_required(level: &str) -> (f32, f32) {
    // Returns (min_years, ideal_years)
    match level.to_lowercase().as_str() {
        "entry" | "junior" => (0.0, 1.0),
        "mid" | "intermediate" => (2.0, 4.0),
        "senior" => (5.0, 8.0),
        "lead" | "principal" | "staff" => (7.0, 12.0),
        "any" => (0.0, 0.0),
        _ => (2.0, 4.0),
    }
}

pub fn calculate_experience_score(
    candidate_experience: &[CandidateExperience],
    required_level: &str,
    job_title: Option<&str>,
) -> ExplainableScore {
    let mut matched: Vec<String> = Vec::new();
    let mut missing: Vec<String> = Vec::new();
    let mut bonus: Vec<String> = Vec::new();
    
    // Calculate total years
    let total_years: f32 = candidate_experience.iter()
        .map(|exp| parse_duration(&exp.duration))
        .sum();
    
    let (min_years, ideal_years) = level_years_required(required_level);
    
    // Base score from years
    let years_score = if required_level.to_lowercase() == "any" {
        100.0
    } else if total_years >= ideal_years {
        100.0
    } else if total_years >= min_years {
        70.0 + (30.0 * (total_years - min_years) / (ideal_years - min_years).max(0.1))
    } else {
        (total_years / min_years.max(0.1) * 70.0).min(70.0)
    };
    
    // Track years
    if total_years >= min_years {
        matched.push(format!("{:.1} years total experience", total_years));
    } else {
        missing.push(format!("Need {:.1}+ years, has {:.1}", min_years, total_years));
    }
    
    // Role relevance bonus
    let mut relevance_bonus: f32 = 0.0;
    if let Some(job) = job_title {
        let job_lower = job.to_lowercase();
        let job_keywords: Vec<&str> = job_lower.split_whitespace().collect();
        
        for exp in candidate_experience {
            let title_lower = exp.title.to_lowercase();
            let matching_keywords: Vec<&&str> = job_keywords.iter()
                .filter(|k| title_lower.contains(*k) && k.len() > 2)
                .collect();
            
            if !matching_keywords.is_empty() {
                relevance_bonus += 5.0;
                bonus.push(format!("Relevant role: {}", exp.title));
            }
        }
    }
    relevance_bonus = relevance_bonus.min(15.0);
    
    // Company prestige bonus (simplified)
    let top_companies = ["google", "meta", "amazon", "microsoft", "apple", "netflix", 
                        "stripe", "airbnb", "uber", "openai", "anthropic"];
    for exp in candidate_experience {
        let company_lower = exp.company.to_lowercase();
        if top_companies.iter().any(|c| company_lower.contains(c)) {
            bonus.push(format!("Top company: {}", exp.company));
            relevance_bonus += 3.0;
            break;
        }
    }
    
    let final_score = ((years_score + relevance_bonus) as i32).min(100).max(0);
    
    let reasoning = if required_level.to_lowercase() == "any" {
        "Any experience level accepted".to_string()
    } else if total_years >= ideal_years {
        format!("Exceeds experience requirement ({:.1} years for {} role)", total_years, required_level)
    } else if total_years >= min_years {
        format!("Meets minimum experience ({:.1} years)", total_years)
    } else {
        format!("Below required experience ({:.1}/{:.1} years)", total_years, min_years)
    };
    
    ExplainableScore {
        score: final_score,
        matched,
        missing,
        bonus,
        reasoning: Some(reasoning),
    }
}
