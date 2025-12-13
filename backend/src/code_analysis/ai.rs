use std::{
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
use crate::github::api::{get_user_repos, get_user_commits, get_commit_detail};

const MODEL_GEMINI: &str = "gemini-2.0-flash";

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

pub async fn generate_characteristics_from_github(
    username: &str,
    token: &str,
) -> Result<CodeCharacteristics, Box<dyn std::error::Error>> {
    // 1. Get user's repos (non-forks)
    let repos = get_user_repos(username, token).await?;

    // 2. Collect patches from commits
    let mut all_patches = String::new();
    let mut commit_count = 0;
    const MAX_COMMITS: usize = 50;
    const MAX_PATCH_LINES: usize = 50;

    for repo in repos.iter().take(5) {
        if commit_count >= MAX_COMMITS { break; }

        let commits = get_user_commits(&repo.owner.login, &repo.name, username, token).await?;

        for commit in commits {
            if commit_count >= MAX_COMMITS { break; }

            // Skip merge commits
            if commit.commit.message.starts_with("Merge") { continue; }

            let detail = get_commit_detail(&repo.owner.login, &repo.name, &commit.sha, token).await?;

            if let Some(files) = detail.files {
                for file in files {
                    if let Some(patch) = file.patch {
                        // Skip tiny changes
                        if file.additions + file.deletions < 5 { continue; }

                        // Truncate large patches by line count
                        let truncated_patch: String = patch
                            .lines()
                            .take(MAX_PATCH_LINES)
                            .collect::<Vec<_>>()
                            .join("\n");

                        all_patches.push_str(&format!(
                            "\n// --- {} ({}) ---\n",
                            file.filename,
                            &commit.sha[..7]
                        ));
                        all_patches.push_str(&truncated_patch);
                    }
                }
            }
            commit_count += 1;
        }
    }

    // 3. Send to Gemini
    let chat_req = ChatRequest::new(vec![
        ChatMessage::system(super::QUESTION),
        ChatMessage::user(all_patches),
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

    let lines: Vec<&str> = res.lines().collect();
    let deserialised: CodeCharacteristics = serde_json::from_str(&lines[1..lines.len()-1].join("\n"))?;

    Ok(deserialised)
}
