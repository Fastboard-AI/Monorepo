use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use uuid::Uuid;

use crate::github::embeddings::generate_embedding;

/// Categories for semantic search queries
#[derive(Debug, Clone, Copy)]
pub enum SearchCategory {
    ErrorHandling,
    NamingConventions,
    CodeComments,
    TestingPatterns,
    AsyncPatterns,
    DataValidation,
    Logging,
    Configuration,
    ClassStructure,
    FunctionalPatterns,
}

impl SearchCategory {
    /// Get the search query for this category
    pub fn query(&self) -> &'static str {
        match self {
            Self::ErrorHandling => "error handling try catch exception result unwrap",
            Self::NamingConventions => "function variable naming conventions style camelCase snake_case",
            Self::CodeComments => "code comments documentation TODO FIXME notes explanations",
            Self::TestingPatterns => "test unit test integration test mock assert expect",
            Self::AsyncPatterns => "async await promise future concurrent parallel",
            Self::DataValidation => "validation input checking sanitize validate parse",
            Self::Logging => "logging debug print console log trace warn error",
            Self::Configuration => "config configuration environment setup settings",
            Self::ClassStructure => "class struct impl interface trait inheritance",
            Self::FunctionalPatterns => "map filter reduce lambda closure higher order function",
        }
    }

    /// Get a human-readable name
    pub fn name(&self) -> &'static str {
        match self {
            Self::ErrorHandling => "error_handling",
            Self::NamingConventions => "naming_style",
            Self::CodeComments => "comments",
            Self::TestingPatterns => "testing",
            Self::AsyncPatterns => "async_patterns",
            Self::DataValidation => "validation",
            Self::Logging => "logging",
            Self::Configuration => "configuration",
            Self::ClassStructure => "class_structure",
            Self::FunctionalPatterns => "functional_patterns",
        }
    }

    /// Get all categories
    pub fn all() -> &'static [SearchCategory] {
        &[
            Self::ErrorHandling,
            Self::NamingConventions,
            Self::CodeComments,
            Self::TestingPatterns,
            Self::AsyncPatterns,
            Self::DataValidation,
            Self::Logging,
            Self::Configuration,
            Self::ClassStructure,
            Self::FunctionalPatterns,
        ]
    }
}

/// A code excerpt retrieved from semantic search
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeExcerpt {
    pub repo_name: String,
    pub file_path: String,
    pub line_start: i32,
    pub line_end: i32,
    pub language: Option<String>,
    pub content: String,
    pub similarity: f32,
}

/// Results from semantic search across all categories
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SearchResults {
    pub error_handling: Vec<CodeExcerpt>,
    pub naming_style: Vec<CodeExcerpt>,
    pub comments: Vec<CodeExcerpt>,
    pub testing: Vec<CodeExcerpt>,
    pub async_patterns: Vec<CodeExcerpt>,
    pub validation: Vec<CodeExcerpt>,
    pub logging: Vec<CodeExcerpt>,
    pub configuration: Vec<CodeExcerpt>,
    pub class_structure: Vec<CodeExcerpt>,
    pub functional_patterns: Vec<CodeExcerpt>,
}

impl SearchResults {
    /// Get excerpts by category name
    pub fn get(&self, category: &str) -> &[CodeExcerpt] {
        match category {
            "error_handling" => &self.error_handling,
            "naming_style" => &self.naming_style,
            "comments" => &self.comments,
            "testing" => &self.testing,
            "async_patterns" => &self.async_patterns,
            "validation" => &self.validation,
            "logging" => &self.logging,
            "configuration" => &self.configuration,
            "class_structure" => &self.class_structure,
            "functional_patterns" => &self.functional_patterns,
            _ => &[],
        }
    }

    /// Get total excerpt count
    pub fn total_count(&self) -> usize {
        self.error_handling.len()
            + self.naming_style.len()
            + self.comments.len()
            + self.testing.len()
            + self.async_patterns.len()
            + self.validation.len()
            + self.logging.len()
            + self.configuration.len()
            + self.class_structure.len()
            + self.functional_patterns.len()
    }

    /// Set excerpts for a category
    fn set(&mut self, category: &str, excerpts: Vec<CodeExcerpt>) {
        match category {
            "error_handling" => self.error_handling = excerpts,
            "naming_style" => self.naming_style = excerpts,
            "comments" => self.comments = excerpts,
            "testing" => self.testing = excerpts,
            "async_patterns" => self.async_patterns = excerpts,
            "validation" => self.validation = excerpts,
            "logging" => self.logging = excerpts,
            "configuration" => self.configuration = excerpts,
            "class_structure" => self.class_structure = excerpts,
            "functional_patterns" => self.functional_patterns = excerpts,
            _ => {}
        }
    }
}

/// Search for similar code chunks using pgvector
pub async fn search_similar(
    conn: &mut PgConnection,
    analysis_id: Uuid,
    query: &str,
    limit: i32,
) -> Result<Vec<CodeExcerpt>, Box<dyn std::error::Error + Send + Sync>> {
    // Generate embedding for the search query
    let query_embedding = generate_embedding(query).await?;

    let embedding_str = format!(
        "[{}]",
        query_embedding
            .iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(",")
    );

    // Query pgvector for similar chunks
    let rows = sqlx::query_as::<_, (String, String, i32, i32, Option<String>, String, f64)>(
        r#"
        SELECT
            repo_name,
            file_path,
            line_start,
            line_end,
            language,
            content,
            1 - (embedding <=> $1::vector) as similarity
        FROM code_embeddings
        WHERE analysis_id = $2
        ORDER BY embedding <=> $1::vector
        LIMIT $3
        "#,
    )
    .bind(&embedding_str)
    .bind(analysis_id)
    .bind(limit)
    .fetch_all(&mut *conn)
    .await?;

    let excerpts = rows
        .into_iter()
        .map(
            |(repo_name, file_path, line_start, line_end, language, content, similarity)| {
                CodeExcerpt {
                    repo_name,
                    file_path,
                    line_start,
                    line_end,
                    language,
                    content,
                    similarity: similarity as f32,
                }
            },
        )
        .collect();

    Ok(excerpts)
}

/// Run semantic search across all categories
pub async fn search_all_categories(
    conn: &mut PgConnection,
    analysis_id: Uuid,
    excerpts_per_category: i32,
) -> Result<SearchResults, Box<dyn std::error::Error + Send + Sync>> {
    let mut results = SearchResults::default();

    for category in SearchCategory::all() {
        let excerpts = search_similar(conn, analysis_id, category.query(), excerpts_per_category)
            .await
            .unwrap_or_default();

        results.set(category.name(), excerpts);
    }

    Ok(results)
}

/// Get a sample of code from each category for the profile generator
/// Returns a condensed view suitable for AI analysis
pub fn summarize_excerpts(results: &SearchResults, max_chars_per_category: usize) -> String {
    let mut summary = String::new();

    for category in SearchCategory::all() {
        let excerpts = results.get(category.name());
        if excerpts.is_empty() {
            continue;
        }

        summary.push_str(&format!("\n=== {} ===\n", category.name().to_uppercase()));

        let mut chars_used = 0;
        for excerpt in excerpts {
            if chars_used >= max_chars_per_category {
                break;
            }

            summary.push_str(&format!(
                "\n// {} ({}:{})\n",
                excerpt.file_path, excerpt.line_start, excerpt.line_end
            ));

            // Truncate long content
            let content = if excerpt.content.len() > 500 {
                format!("{}...", &excerpt.content[..500])
            } else {
                excerpt.content.clone()
            };

            summary.push_str(&content);
            summary.push('\n');

            chars_used += content.len();
        }
    }

    summary
}

/// Get statistics about the stored embeddings
pub async fn get_embedding_stats(
    conn: &mut PgConnection,
    analysis_id: Uuid,
) -> Result<EmbeddingStats, Box<dyn std::error::Error + Send + Sync>> {
    let row = sqlx::query_as::<_, (i64, Option<i64>, Option<i64>)>(
        r#"
        SELECT
            COUNT(*) as chunk_count,
            SUM(line_end - line_start) as total_lines,
            COUNT(DISTINCT repo_name) as repo_count
        FROM code_embeddings
        WHERE analysis_id = $1
        "#,
    )
    .bind(analysis_id)
    .fetch_one(&mut *conn)
    .await?;

    let languages = sqlx::query_as::<_, (String,)>(
        r#"
        SELECT DISTINCT language
        FROM code_embeddings
        WHERE analysis_id = $1 AND language IS NOT NULL
        "#,
    )
    .bind(analysis_id)
    .fetch_all(&mut *conn)
    .await?;

    Ok(EmbeddingStats {
        chunk_count: row.0 as u32,
        total_lines: row.1.unwrap_or(0) as u32,
        repo_count: row.2.unwrap_or(0) as u32,
        languages: languages.into_iter().map(|(l,)| l).collect(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmbeddingStats {
    pub chunk_count: u32,
    pub total_lines: u32,
    pub repo_count: u32,
    pub languages: Vec<String>,
}
