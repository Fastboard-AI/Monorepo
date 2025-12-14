use std::{
    collections::HashSet,
    fs::File,
    io::{self, Read},
    path::Path,
    process::Command,
};

use genai::{
    Client,
    chat::{ChatMessage, ChatOptions, ChatRequest},
};
use walkdir::WalkDir;

use crate::code_analysis::characteristics::CodeCharacteristics;
use crate::github::api::{get_user_repos, get_repo_tree, get_file_content};

const MODEL_GEMINI: &str = "gemini-2.0-flash";

// Code file extensions to analyze
const CODE_EXTENSIONS: &[&str] = &[
    ".rs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go",
    ".java", ".cpp", ".c", ".h", ".hpp", ".rb", ".swift", ".kt",
    ".cs", ".scala", ".clj", ".ex", ".exs", ".hs", ".ml",
];

// Limits for analysis
const MAX_FILES: usize = 30;
const MAX_LINES_PER_FILE: usize = 500;
const MAX_TOTAL_LINES: usize = 5000;
const MAX_FILE_SIZE: u64 = 50000; // 50KB

pub async fn generate_characteristics_from_repo(
    url: &str,
) -> Result<CodeCharacteristics, Box<dyn std::error::Error>> {
    // Get all code from repo

    let repo_path = Path::new("temp_clone");
    let mut command = Command::new("git");

    command
        .arg("clone")
        .arg("--depth")
        .arg("1")
        .arg(url)
        .arg(repo_path);

    command.spawn()?.wait()?;

    let files = concatenate_files(repo_path)?;

    let chat_req = ChatRequest::new(vec![
        ChatMessage::system(super::QUESTION),
        ChatMessage::user(files),
    ]);
    let client = Client::default();

    let options = ChatOptions::default().with_temperature(0.0);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let res = chat_res
            .content
            .joined_texts()
            .ok_or("Failed to join texts")?;

    let lines: Vec<&str> = res.lines()
            .collect();

    let deseralised: CodeCharacteristics = serde_json::from_str(&lines[1..lines.len()-1].join("\n"))?;

    let mut command = Command::new("rm");
    command.arg("-rf")
        .arg(repo_path);

    command.spawn()?.wait()?;

    Ok(deseralised)
}

fn concatenate_files(repo_path: &Path) -> Result<String, io::Error> {
    let mut all_code = String::new();
    let walker = WalkDir::new(repo_path).into_iter();

    for entry in walker.filter_entry(|e| !is_hidden(e)) {
        let dir = entry?;

        let path = dir.path();

        if path.is_file() {
            all_code.push_str(&format!("\n\n// --- FILE: {} ---\n\n", path.display()));

            all_code.push_str(&read_file_contents(path)?);
        }
    }

    Ok(all_code)
}

fn is_hidden(entry: &walkdir::DirEntry) -> bool {
    if entry.file_name() == ".git" {
        return true;
    }

    entry
        .file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
}

fn read_file_contents(path: &Path) -> Result<String, io::Error> {
    let mut file = File::open(path)?;
    let mut contents = Vec::new();
    file.read_to_end(&mut contents)?;

    Ok(String::try_from(contents).unwrap_or(String::default()))
}

/// Check if a file path is a code file based on extension
fn is_code_file(path: &str) -> bool {
    CODE_EXTENSIONS.iter().any(|ext| path.ends_with(ext))
}

/// Extract language from file path
fn get_language(path: &str) -> Option<String> {
    path.rsplit('.').next().map(|ext| ext.to_lowercase())
}

pub async fn generate_characteristics_from_github(
    username: &str,
    token: &str,
) -> Result<CodeCharacteristics, Box<dyn std::error::Error + Send + Sync>> {
    // 1. Get user's repos (non-forks, sorted by update)
    let repos = get_user_repos(username, token).await?;

    let mut all_code = String::new();
    let mut files_analyzed: u32 = 0;
    let mut total_lines: usize = 0;
    let mut languages: HashSet<String> = HashSet::new();

    // 2. For each repo, get file tree and fetch code files
    for repo in repos.iter().take(5) {
        if files_analyzed as usize >= MAX_FILES || total_lines >= MAX_TOTAL_LINES {
            break;
        }

        // Get repository file tree
        let tree = match get_repo_tree(&repo.owner.login, &repo.name, token).await {
            Ok(t) => t,
            Err(_) => continue, // Skip repos we can't access
        };

        // Filter to code files only, sorted by size (smaller first for variety)
        let mut code_files: Vec<_> = tree.tree.iter()
            .filter(|f| f.item_type == "blob")
            .filter(|f| is_code_file(&f.path))
            .filter(|f| f.size.unwrap_or(0) < MAX_FILE_SIZE)
            .filter(|f| !f.path.contains("node_modules/"))
            .filter(|f| !f.path.contains("vendor/"))
            .filter(|f| !f.path.contains(".min."))
            .filter(|f| !f.path.contains("dist/"))
            .filter(|f| !f.path.contains("build/"))
            .collect();

        // Sort by size ascending for variety
        code_files.sort_by_key(|f| f.size.unwrap_or(0));

        // Calculate files to fetch per repo (distribute across repos)
        let files_per_repo = MAX_FILES / 5;

        // Fetch content of representative files
        for file in code_files.iter().take(files_per_repo) {
            if files_analyzed as usize >= MAX_FILES || total_lines >= MAX_TOTAL_LINES {
                break;
            }

            // Fetch file content
            let content = match get_file_content(
                &repo.owner.login, &repo.name, &file.path, token
            ).await {
                Ok(c) => c,
                Err(_) => continue, // Skip files we can't read
            };

            // Truncate to max lines per file
            let lines: Vec<&str> = content.lines().take(MAX_LINES_PER_FILE).collect();
            let line_count = lines.len();

            // Skip near-empty files
            if line_count < 10 {
                continue;
            }

            // Track language
            if let Some(lang) = get_language(&file.path) {
                languages.insert(lang);
            }

            // Append with file header
            all_code.push_str(&format!("\n// FILE: {} ({})\n", file.path, repo.name));
            all_code.push_str(&lines.join("\n"));
            all_code.push('\n');

            files_analyzed += 1;
            total_lines += line_count;
        }
    }

    // Check if we have enough code to analyze
    if files_analyzed == 0 || total_lines < 100 {
        return Err("Not enough code found to analyze".into());
    }

    // 3. Send to Gemini for analysis
    let chat_req = ChatRequest::new(vec![
        ChatMessage::system(super::QUESTION),
        ChatMessage::user(all_code),
    ]);
    let client = Client::default();
    let options = ChatOptions::default().with_temperature(0.0);

    let chat_res = client
        .exec_chat(MODEL_GEMINI, chat_req, Some(&options))
        .await?;

    let res = chat_res
        .content
        .joined_texts()
        .ok_or("Failed to join texts")?;

    // Parse JSON response (handle markdown code blocks)
    let lines: Vec<&str> = res.lines().collect();
    let json_str = if lines.len() > 2 && lines[0].contains("```") {
        // Response wrapped in code block
        lines[1..lines.len()-1].join("\n")
    } else {
        res.clone()
    };

    let characteristics: CodeCharacteristics = serde_json::from_str(&json_str)?;

    // 4. Add confidence metrics
    let languages_vec: Vec<String> = languages.into_iter().collect();
    Ok(characteristics.with_confidence(
        files_analyzed,
        total_lines as u32,
        languages_vec,
    ))
}
