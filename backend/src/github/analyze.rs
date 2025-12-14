use std::collections::HashMap;

use sqlx::PgConnection;
use uuid::Uuid;

use crate::github::{
    api::{get_user_profile, get_user_repos_full, get_repo_tree, get_file_content, GitHubRepoFull},
    ai_analysis::analyze_code_for_ai_usage,
    embeddings::{chunk_code, store_chunks_batch, detect_language, CodeChunk},
    semantic_search::{search_all_categories, summarize_excerpts, get_embedding_stats},
    stats::{GitHubStats, GitHubProfile, RepositoryInfo, AIAnalysis, AnalysisMetadata},
};

const CODE_EXTENSIONS: &[&str] = &[
    ".rs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go",
    ".java", ".cpp", ".c", ".h", ".hpp", ".rb", ".swift", ".kt",
    ".cs", ".scala", ".clj", ".ex", ".exs", ".hs", ".ml", ".php",
    ".vue", ".svelte",
];

// Deep analysis limits (reduced for faster testing)
const MAX_REPOS: usize = 5;
const MAX_FILES_PER_REPO: usize = 10;
const MAX_TOTAL_FILES: usize = 30;
const MAX_FILE_SIZE: u64 = 50000;
const EXCERPTS_PER_CATEGORY: i32 = 3;

fn is_code_file(path: &str) -> bool {
    CODE_EXTENSIONS.iter().any(|ext| path.ends_with(ext))
}

fn should_skip_path(path: &str) -> bool {
    let path_lower = path.to_lowercase();

    // Skip directories
    path.contains("node_modules/")
        || path.contains("vendor/")
        || path.contains("dist/")
        || path.contains("build/")
        || path.contains("target/")
        || path.contains(".git/")
        || path.contains("__pycache__/")
        || path.contains(".next/")
        || path.contains("coverage/")
        || path.contains("test/")
        || path.contains("tests/")
        || path.contains("__tests__/")
        || path.contains("spec/")
        // Skip config files
        || path_lower.contains(".env")
        || path_lower.contains("config.")
        || path_lower.contains(".config.")
        || path_lower.contains("eslint")
        || path_lower.contains("prettier")
        || path_lower.contains("tsconfig")
        || path_lower.contains("package.json")
        || path_lower.contains("package-lock")
        || path_lower.contains("cargo.toml")
        || path_lower.contains("cargo.lock")
        || path_lower.contains("yarn.lock")
        || path_lower.contains("pnpm-lock")
        || path_lower.contains("dockerfile")
        || path_lower.contains("docker-compose")
        || path_lower.contains("makefile")
        || path_lower.contains(".min.")
        || path_lower.ends_with(".json")
        || path_lower.ends_with(".yaml")
        || path_lower.ends_with(".yml")
        || path_lower.ends_with(".toml")
        || path_lower.ends_with(".lock")
        || path_lower.ends_with(".md")
        || path_lower.ends_with(".txt")
}

/// Analyze a GitHub user with deep code analysis using embeddings
pub async fn analyze_github_user(
    username: &str,
    token: &str,
) -> Result<GitHubStats, Box<dyn std::error::Error + Send + Sync>> {
    // 1. Fetch user profile
    let user = get_user_profile(username, token).await?;

    let profile = GitHubProfile {
        name: user.name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        created_at: user.created_at,
    };

    // 2. Fetch all repos
    let repos = get_user_repos_full(username, token).await?;

    // 3. Convert repos to RepositoryInfo
    let repositories: Vec<RepositoryInfo> = repos.iter().map(|r| RepositoryInfo {
        name: r.name.clone(),
        description: r.description.clone(),
        language: r.language.clone(),
        is_fork: r.fork,
        size: r.size,
        created_at: r.created_at.clone(),
        updated_at: r.updated_at.clone(),
    }).collect();

    // 4. Aggregate languages
    let mut languages: HashMap<String, u32> = HashMap::new();
    for repo in repos.iter() {
        if let Some(ref lang) = repo.language {
            *languages.entry(lang.clone()).or_insert(0) += 1;
        }
    }

    let total_repos = repos.len().max(1) as f32;
    let languages: HashMap<String, u32> = languages
        .into_iter()
        .map(|(k, v)| (k, ((v as f32 / total_repos) * 100.0) as u32))
        .collect();

    // 5. Fetch code samples for AI analysis (simplified - no DB)
    let code_samples = fetch_code_samples_simple(username, &repos, token).await;

    // 6. Analyze code for AI usage patterns
    let ai_analysis = if !code_samples.is_empty() {
        analyze_code_for_ai_usage(&code_samples).await.unwrap_or_default()
    } else {
        AIAnalysis::default()
    };

    // 7. Build final stats object (without deep analysis for now)
    let stats = GitHubStats {
        username: username.to_string(),
        profile,
        repositories,
        ai_analysis,
        languages,
        analyzed_at: chrono::Utc::now().to_rfc3339(),
        code_excerpts: None,
        analysis_metadata: None,
    };

    Ok(stats)
}

/// Deep analysis - collects code samples without embeddings
pub async fn analyze_github_user_deep(
    _conn: &mut PgConnection,
    username: &str,
    token: &str,
) -> Result<GitHubStats, Box<dyn std::error::Error + Send + Sync>> {
    println!("[DEEP] Starting analysis for {}", username);

    // 1. Fetch user profile
    println!("[DEEP] Fetching user profile...");
    let user = get_user_profile(username, token).await?;
    println!("[DEEP] Got profile: {:?}", user.name);

    let profile = GitHubProfile {
        name: user.name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        created_at: user.created_at,
    };

    // 2. Fetch all repos
    let repos = get_user_repos_full(username, token).await?;

    // 3. Convert repos to RepositoryInfo
    let repositories: Vec<RepositoryInfo> = repos.iter().map(|r| RepositoryInfo {
        name: r.name.clone(),
        description: r.description.clone(),
        language: r.language.clone(),
        is_fork: r.fork,
        size: r.size,
        created_at: r.created_at.clone(),
        updated_at: r.updated_at.clone(),
    }).collect();

    // 4. Aggregate languages
    let mut languages: HashMap<String, u32> = HashMap::new();
    for repo in repos.iter() {
        if let Some(ref lang) = repo.language {
            *languages.entry(lang.clone()).or_insert(0) += 1;
        }
    }

    let total_repos = repos.len().max(1) as f32;
    let languages: HashMap<String, u32> = languages
        .into_iter()
        .map(|(k, v)| (k, ((v as f32 / total_repos) * 100.0) as u32))
        .collect();

    // 5. Deep code analysis WITHOUT embeddings - just collect samples
    println!("[DEEP] Collecting code samples...");
    let (code_excerpts, analysis_metadata, all_code) =
        collect_code_samples(&repos, token).await;
    println!("[DEEP] Collected {} files, {} lines", analysis_metadata.chunks_analyzed, analysis_metadata.total_lines);

    // 6. Analyze code for AI usage patterns
    println!("[DEEP] Running AI usage analysis...");
    let ai_analysis = if !all_code.is_empty() {
        analyze_code_for_ai_usage(&all_code).await.unwrap_or_default()
    } else {
        AIAnalysis::default()
    };
    println!("[DEEP] AI analysis complete");

    // 7. Build final stats object
    let stats = GitHubStats {
        username: username.to_string(),
        profile,
        repositories,
        ai_analysis,
        languages,
        analyzed_at: chrono::Utc::now().to_rfc3339(),
        code_excerpts: Some(code_excerpts),
        analysis_metadata: Some(analysis_metadata),
    };

    Ok(stats)
}

/// Collect code samples and categorize by keywords (no embeddings)
async fn collect_code_samples(
    repos: &[GitHubRepoFull],
    token: &str,
) -> (crate::github::semantic_search::SearchResults, AnalysisMetadata, String) {
    use crate::github::semantic_search::{SearchResults, CodeExcerpt};

    let mut results = SearchResults::default();
    let mut all_code = String::new();
    let mut total_files = 0u32;
    let mut total_lines = 0u32;
    let mut languages_set = std::collections::HashSet::new();

    let non_fork_repos: Vec<_> = repos.iter().filter(|r| !r.fork).collect();
    let repos_analyzed = non_fork_repos.len().min(MAX_REPOS) as u32;

    for (repo_idx, repo) in non_fork_repos.iter().take(MAX_REPOS).enumerate() {
        if total_files >= MAX_TOTAL_FILES as u32 {
            break;
        }

        println!("[DEEP] [{}/{}] {}", repo_idx + 1, repos_analyzed, repo.name);

        let tree = match get_repo_tree(&repo.owner.login, &repo.name, token).await {
            Ok(t) => t,
            Err(_) => continue,
        };

        let code_files: Vec<_> = tree.tree.iter()
            .filter(|f| f.item_type == "blob")
            .filter(|f| is_code_file(&f.path))
            .filter(|f| f.size.unwrap_or(0) < MAX_FILE_SIZE)
            .filter(|f| !should_skip_path(&f.path))
            .take(MAX_FILES_PER_REPO)
            .collect();

        for file in code_files {
            if total_files >= MAX_TOTAL_FILES as u32 {
                break;
            }

            let content = match get_file_content(&repo.owner.login, &repo.name, &file.path, token).await {
                Ok(c) => c,
                Err(_) => continue,
            };

            if content.len() < 50 {
                continue;
            }

            let language = detect_language(&file.path);
            if let Some(ref lang) = language {
                languages_set.insert(lang.clone());
            }

            let lines: Vec<&str> = content.lines().take(300).collect();
            let line_count = lines.len() as u32;
            let excerpt_content = lines.join("\n");

            // Categorize by keywords
            let content_lower = content.to_lowercase();

            let excerpt = CodeExcerpt {
                repo_name: repo.name.clone(),
                file_path: file.path.clone(),
                line_start: 1,
                line_end: line_count as i32,
                language: language.clone(),
                content: excerpt_content.clone(),
                similarity: 1.0,
            };

            // Simple keyword categorization
            if content_lower.contains("error") || content_lower.contains("catch") || content_lower.contains("exception") || content_lower.contains("result") || content_lower.contains("unwrap") {
                if results.error_handling.len() < 3 { results.error_handling.push(excerpt.clone()); }
            }
            if content_lower.contains("async") || content_lower.contains("await") || content_lower.contains("promise") || content_lower.contains("future") {
                if results.async_patterns.len() < 3 { results.async_patterns.push(excerpt.clone()); }
            }
            if content_lower.contains("test") || content_lower.contains("assert") || content_lower.contains("expect") {
                if results.testing.len() < 3 { results.testing.push(excerpt.clone()); }
            }
            if content_lower.contains("log") || content_lower.contains("debug") || content_lower.contains("print") || content_lower.contains("console") {
                if results.logging.len() < 3 { results.logging.push(excerpt.clone()); }
            }
            if content_lower.contains("class") || content_lower.contains("struct") || content_lower.contains("impl") || content_lower.contains("interface") {
                if results.class_structure.len() < 3 { results.class_structure.push(excerpt.clone()); }
            }
            if content_lower.contains("map") || content_lower.contains("filter") || content_lower.contains("reduce") || content_lower.contains("lambda") || content_lower.contains("closure") {
                if results.functional_patterns.len() < 3 { results.functional_patterns.push(excerpt.clone()); }
            }
            if content_lower.contains("valid") || content_lower.contains("check") || content_lower.contains("parse") {
                if results.validation.len() < 3 { results.validation.push(excerpt.clone()); }
            }
            // Always add to naming_style as it shows general coding style
            if results.naming_style.len() < 3 {
                results.naming_style.push(excerpt.clone());
            }

            // Collect for AI analysis
            all_code.push_str(&format!("\n// FILE: {} ({})\n", file.path, repo.name));
            all_code.push_str(&excerpt_content);
            all_code.push('\n');

            total_files += 1;
            total_lines += line_count;
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    let metadata = AnalysisMetadata {
        chunks_analyzed: total_files,
        total_lines,
        repos_analyzed,
        languages_detected: languages_set.into_iter().collect(),
    };

    (results, metadata, all_code)
}

/// Deep analysis of repositories using embeddings (DEPRECATED - not used)
#[allow(dead_code)]
async fn deep_analyze_repos(
    conn: &mut PgConnection,
    analysis_id: Uuid,
    username: &str,
    repos: &[GitHubRepoFull],
    token: &str,
) -> Result<(crate::github::semantic_search::SearchResults, AnalysisMetadata, String), Box<dyn std::error::Error + Send + Sync>> {
    let mut all_chunks: Vec<CodeChunk> = Vec::new();
    let mut all_code = String::new();
    let mut total_files = 0;

    // Only analyze non-fork repos
    let non_fork_repos: Vec<_> = repos.iter().filter(|r| !r.fork).collect();
    println!("[DEEP] Found {} non-fork repos to analyze", non_fork_repos.len());

    for (repo_idx, repo) in non_fork_repos.iter().take(MAX_REPOS).enumerate() {
        if total_files >= MAX_TOTAL_FILES {
            break;
        }

        println!("[DEEP] [{}/{}] Analyzing repo: {}", repo_idx + 1, non_fork_repos.len().min(MAX_REPOS), repo.name);

        // Get repository file tree
        let tree = match get_repo_tree(&repo.owner.login, &repo.name, token).await {
            Ok(t) => t,
            Err(e) => {
                println!("[DEEP]   Skipping {} - tree error: {}", repo.name, e);
                continue;
            }
        };

        // Filter to code files
        let code_files: Vec<_> = tree.tree.iter()
            .filter(|f| f.item_type == "blob")
            .filter(|f| is_code_file(&f.path))
            .filter(|f| f.size.unwrap_or(0) < MAX_FILE_SIZE)
            .filter(|f| !should_skip_path(&f.path))
            .take(MAX_FILES_PER_REPO)
            .collect();

        println!("[DEEP]   Found {} code files", code_files.len());

        for (file_idx, file) in code_files.iter().enumerate() {
            if total_files >= MAX_TOTAL_FILES {
                break;
            }

            println!("[DEEP]     Fetching [{}/{}]: {}", file_idx + 1, code_files.len(), file.path);

            let content = match get_file_content(
                &repo.owner.login, &repo.name, &file.path, token
            ).await {
                Ok(c) => c,
                Err(e) => {
                    println!("[DEEP]     Error: {}", e);
                    continue;
                }
            };

            if content.len() < 100 {
                continue;
            }

            // Detect language
            let language = detect_language(&file.path);

            // Chunk the code
            let chunks = chunk_code(
                &content,
                &repo.name,
                &file.path,
                language.as_deref(),
            );

            all_chunks.extend(chunks);

            // Also collect raw code for AI analysis
            all_code.push_str(&format!("\n// FILE: {} ({})\n", file.path, repo.name));
            // Limit to first 500 lines per file for AI analysis
            let truncated: String = content.lines().take(500).collect::<Vec<_>>().join("\n");
            all_code.push_str(&truncated);
            all_code.push('\n');

            total_files += 1;
        }

        // Small delay between repos to avoid rate limits
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    // Store chunks with embeddings
    println!("[DEEP] Collected {} chunks, storing with embeddings...", all_chunks.len());
    let stored_count = store_chunks_batch(conn, analysis_id, username, all_chunks).await?;
    println!("[DEEP] Stored {} chunks", stored_count);

    // Run semantic search across all categories
    println!("[DEEP] Running semantic search...");
    let code_excerpts = search_all_categories(conn, analysis_id, EXCERPTS_PER_CATEGORY).await?;
    println!("[DEEP] Semantic search complete");

    // Get embedding stats
    let stats = get_embedding_stats(conn, analysis_id).await?;

    let analysis_metadata = AnalysisMetadata {
        chunks_analyzed: stored_count as u32,
        total_lines: stats.total_lines,
        repos_analyzed: stats.repo_count,
        languages_detected: stats.languages,
    };

    Ok((code_excerpts, analysis_metadata, all_code))
}

/// Simple code fetching without embeddings (for basic analysis)
async fn fetch_code_samples_simple(
    _username: &str,
    repos: &[GitHubRepoFull],
    token: &str,
) -> String {
    let mut all_code = String::new();
    let mut files_analyzed: usize = 0;
    let mut total_lines: usize = 0;

    const MAX_FILES: usize = 30;
    const MAX_LINES_PER_FILE: usize = 500;
    const MAX_TOTAL_LINES: usize = 5000;
    const MAX_FILE_SIZE_SIMPLE: u64 = 50000;

    // Only analyze non-fork repos
    let non_fork_repos: Vec<_> = repos.iter().filter(|r| !r.fork).collect();

    for repo in non_fork_repos.iter().take(5) {
        if files_analyzed >= MAX_FILES || total_lines >= MAX_TOTAL_LINES {
            break;
        }

        let tree = match get_repo_tree(&repo.owner.login, &repo.name, token).await {
            Ok(t) => t,
            Err(_) => continue,
        };

        let mut code_files: Vec<_> = tree.tree.iter()
            .filter(|f| f.item_type == "blob")
            .filter(|f| is_code_file(&f.path))
            .filter(|f| f.size.unwrap_or(0) < MAX_FILE_SIZE_SIMPLE)
            .filter(|f| !should_skip_path(&f.path))
            .collect();

        code_files.sort_by_key(|f| f.size.unwrap_or(0));

        let files_per_repo = MAX_FILES / 5;

        for file in code_files.iter().take(files_per_repo) {
            if files_analyzed >= MAX_FILES || total_lines >= MAX_TOTAL_LINES {
                break;
            }

            let content = match get_file_content(
                &repo.owner.login, &repo.name, &file.path, token
            ).await {
                Ok(c) => c,
                Err(_) => continue,
            };

            let lines: Vec<&str> = content.lines().take(MAX_LINES_PER_FILE).collect();
            let line_count = lines.len();

            if line_count < 10 {
                continue;
            }

            all_code.push_str(&format!("\n// FILE: {} ({})\n", file.path, repo.name));
            all_code.push_str(&lines.join("\n"));
            all_code.push('\n');

            files_analyzed += 1;
            total_lines += line_count;
        }
    }

    all_code
}

/// Get code excerpts summary for the profile generator
pub fn get_excerpts_for_profile(stats: &GitHubStats) -> Option<String> {
    stats.code_excerpts.as_ref().map(|excerpts| {
        summarize_excerpts(excerpts, 2000)
    })
}
