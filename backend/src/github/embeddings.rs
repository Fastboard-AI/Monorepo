use reqwest::Client;
use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use uuid::Uuid;

const GEMINI_EMBEDDING_MODEL: &str = "text-embedding-004";
const GEMINI_API_URL: &str = "https://generativelanguage.googleapis.com/v1beta/models";
const CHUNK_SIZE: usize = 300;
const MAX_CHUNKS_PER_FILE: usize = 10;

#[derive(Debug, Clone)]
pub struct CodeChunk {
    pub repo_name: String,
    pub file_path: String,
    pub line_start: i32,
    pub line_end: i32,
    pub language: Option<String>,
    pub content: String,
}

#[derive(Serialize)]
struct EmbeddingRequest {
    model: String,
    content: ContentPart,
}

#[derive(Serialize)]
struct ContentPart {
    parts: Vec<TextPart>,
}

#[derive(Serialize)]
struct TextPart {
    text: String,
}

#[derive(Deserialize)]
struct EmbeddingResponse {
    embedding: Option<EmbeddingValue>,
}

#[derive(Deserialize)]
struct EmbeddingValue {
    values: Vec<f32>,
}

/// Generate embedding for a text using Gemini text-embedding-004
pub async fn generate_embedding(
    text: &str,
) -> Result<Vec<f32>, Box<dyn std::error::Error + Send + Sync>> {
    let api_key = std::env::var("GEMINI_API_KEY")?;
    let client = Client::new();

    let url = format!(
        "{}/{}:embedContent?key={}",
        GEMINI_API_URL, GEMINI_EMBEDDING_MODEL, api_key
    );

    let request = EmbeddingRequest {
        model: format!("models/{}", GEMINI_EMBEDDING_MODEL),
        content: ContentPart {
            parts: vec![TextPart {
                text: text.to_string(),
            }],
        },
    };

    let response: EmbeddingResponse = client
        .post(&url)
        .json(&request)
        .send()
        .await?
        .json()
        .await?;

    response
        .embedding
        .map(|e| e.values)
        .ok_or_else(|| "No embedding returned".into())
}

/// Split code into chunks of approximately CHUNK_SIZE lines
pub fn chunk_code(
    content: &str,
    repo_name: &str,
    file_path: &str,
    language: Option<&str>,
) -> Vec<CodeChunk> {
    let lines: Vec<&str> = content.lines().collect();
    let mut chunks = Vec::new();

    if lines.is_empty() {
        return chunks;
    }

    let mut i = 0;
    let mut chunk_count = 0;

    while i < lines.len() && chunk_count < MAX_CHUNKS_PER_FILE {
        let start = i;
        let end = (i + CHUNK_SIZE).min(lines.len());

        // Try to find a natural break point (empty line, function end, etc.)
        let actual_end = find_natural_break(&lines, start, end);

        let chunk_content: String = lines[start..actual_end].join("\n");

        if chunk_content.trim().len() > 50 {
            chunks.push(CodeChunk {
                repo_name: repo_name.to_string(),
                file_path: file_path.to_string(),
                line_start: (start + 1) as i32,
                line_end: actual_end as i32,
                language: language.map(|s| s.to_string()),
                content: chunk_content,
            });
            chunk_count += 1;
        }

        i = actual_end;
    }

    chunks
}

/// Find a natural break point near the target end
fn find_natural_break(lines: &[&str], _start: usize, target_end: usize) -> usize {
    // Look for empty lines or closing braces near the target
    let search_start = target_end.saturating_sub(20);
    let search_end = (target_end + 20).min(lines.len());

    for i in (search_start..search_end).rev() {
        let line = lines[i].trim();
        if line.is_empty() || line == "}" || line == "};" || line.starts_with("// ") {
            return i + 1;
        }
    }

    target_end
}

/// Store code chunks with embeddings in the database
pub async fn store_chunks_with_embeddings(
    conn: &mut PgConnection,
    analysis_id: Uuid,
    username: &str,
    chunks: &[CodeChunk],
) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    let mut stored = 0;

    for chunk in chunks {
        // Generate embedding for this chunk
        let embedding = match generate_embedding(&chunk.content).await {
            Ok(e) => e,
            Err(_) => continue, // Skip chunks that fail to embed
        };

        // Convert embedding to pgvector format string
        let embedding_str = format!(
            "[{}]",
            embedding
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(",")
        );

        // Insert into database
        let result = sqlx::query(
            r#"
            INSERT INTO code_embeddings
                (analysis_id, username, repo_name, file_path, line_start, line_end, language, content, embedding)
            VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
            "#,
        )
        .bind(analysis_id)
        .bind(username)
        .bind(&chunk.repo_name)
        .bind(&chunk.file_path)
        .bind(chunk.line_start)
        .bind(chunk.line_end)
        .bind(&chunk.language)
        .bind(&chunk.content)
        .bind(&embedding_str)
        .execute(&mut *conn)
        .await;

        if result.is_ok() {
            stored += 1;
        }
    }

    Ok(stored)
}

/// Batch store chunks - generates embeddings in parallel batches
pub async fn store_chunks_batch(
    conn: &mut PgConnection,
    analysis_id: Uuid,
    username: &str,
    chunks: Vec<CodeChunk>,
) -> Result<usize, Box<dyn std::error::Error + Send + Sync>> {
    use futures::future::join_all;

    let mut total_stored = 0;
    let batch_size = 5; // Process 5 chunks at a time to avoid rate limits

    for batch in chunks.chunks(batch_size) {
        // Generate embeddings in parallel
        let embedding_futures: Vec<_> = batch
            .iter()
            .map(|chunk| generate_embedding(&chunk.content))
            .collect();

        let embeddings = join_all(embedding_futures).await;

        // Store successful embeddings
        for (chunk, embedding_result) in batch.iter().zip(embeddings.into_iter()) {
            if let Ok(embedding) = embedding_result {
                let embedding_str = format!(
                    "[{}]",
                    embedding
                        .iter()
                        .map(|v| v.to_string())
                        .collect::<Vec<_>>()
                        .join(",")
                );

                let result = sqlx::query(
                    r#"
                    INSERT INTO code_embeddings
                        (analysis_id, username, repo_name, file_path, line_start, line_end, language, content, embedding)
                    VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)
                    "#,
                )
                .bind(analysis_id)
                .bind(username)
                .bind(&chunk.repo_name)
                .bind(&chunk.file_path)
                .bind(chunk.line_start)
                .bind(chunk.line_end)
                .bind(&chunk.language)
                .bind(&chunk.content)
                .bind(&embedding_str)
                .execute(&mut *conn)
                .await;

                if result.is_ok() {
                    total_stored += 1;
                }
            }
        }

        // Small delay between batches to avoid rate limits
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    Ok(total_stored)
}

/// Delete all embeddings for an analysis session
pub async fn cleanup_embeddings(
    conn: &mut PgConnection,
    analysis_id: Uuid,
) -> Result<u64, Box<dyn std::error::Error + Send + Sync>> {
    let result = sqlx::query("DELETE FROM code_embeddings WHERE analysis_id = $1")
        .bind(analysis_id)
        .execute(&mut *conn)
        .await?;

    Ok(result.rows_affected())
}

/// Get the language from file extension
pub fn detect_language(file_path: &str) -> Option<String> {
    let ext = file_path.rsplit('.').next()?;
    match ext {
        "rs" => Some("Rust".to_string()),
        "ts" | "tsx" => Some("TypeScript".to_string()),
        "js" | "jsx" => Some("JavaScript".to_string()),
        "py" => Some("Python".to_string()),
        "go" => Some("Go".to_string()),
        "java" => Some("Java".to_string()),
        "cpp" | "cc" | "cxx" => Some("C++".to_string()),
        "c" | "h" => Some("C".to_string()),
        "rb" => Some("Ruby".to_string()),
        "swift" => Some("Swift".to_string()),
        "kt" => Some("Kotlin".to_string()),
        "cs" => Some("C#".to_string()),
        "scala" => Some("Scala".to_string()),
        "ex" | "exs" => Some("Elixir".to_string()),
        "hs" => Some("Haskell".to_string()),
        "ml" => Some("OCaml".to_string()),
        "php" => Some("PHP".to_string()),
        "vue" => Some("Vue".to_string()),
        "svelte" => Some("Svelte".to_string()),
        _ => None,
    }
}
