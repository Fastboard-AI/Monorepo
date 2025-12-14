use serde::Deserialize;

const GITHUB_API: &str = "https://api.github.com";

#[derive(Deserialize)]
pub struct GitHubRepo {
    pub name: String,
    pub owner: RepoOwner,
    pub fork: bool,
}

#[derive(Deserialize)]
pub struct RepoOwner {
    pub login: String,
}

#[derive(Deserialize)]
pub struct GitHubCommit {
    pub sha: String,
    pub commit: CommitInfo,
}

#[derive(Deserialize)]
pub struct CommitInfo {
    pub message: String,
}

#[derive(Deserialize)]
pub struct CommitDetail {
    pub files: Option<Vec<CommitFile>>,
}

#[derive(Deserialize)]
pub struct CommitFile {
    pub filename: String,
    pub patch: Option<String>,
    pub additions: i32,
    pub deletions: i32,
}

// Tree API types
#[derive(Deserialize)]
pub struct RepoTree {
    pub tree: Vec<TreeItem>,
}

#[derive(Deserialize)]
pub struct TreeItem {
    pub path: String,
    #[serde(rename = "type")]
    pub item_type: String,
    pub size: Option<u64>,
}

// File content API types
#[derive(Deserialize)]
pub struct FileContent {
    pub content: Option<String>,
    pub encoding: Option<String>,
}

pub async fn get_user_repos(
    username: &str,
    token: &str,
) -> Result<Vec<GitHubRepo>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = format!("{}/users/{}/repos?sort=updated&per_page=10", GITHUB_API, username);

    let repos: Vec<GitHubRepo> = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?
        .json()
        .await?;

    // Filter out forks
    Ok(repos.into_iter().filter(|r| !r.fork).collect())
}

pub async fn get_user_commits(
    owner: &str,
    repo: &str,
    author: &str,
    token: &str,
) -> Result<Vec<GitHubCommit>, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/repos/{}/{}/commits?author={}&per_page=20",
        GITHUB_API, owner, repo, author
    );

    let commits: Vec<GitHubCommit> = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?
        .json()
        .await?;

    Ok(commits)
}

pub async fn get_commit_detail(
    owner: &str,
    repo: &str,
    sha: &str,
    token: &str,
) -> Result<CommitDetail, Box<dyn std::error::Error>> {
    let client = reqwest::Client::new();
    let url = format!("{}/repos/{}/{}/commits/{}", GITHUB_API, owner, repo, sha);

    let detail: CommitDetail = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?
        .json()
        .await?;

    Ok(detail)
}

/// Get repository file tree (recursive)
pub async fn get_repo_tree(
    owner: &str,
    repo: &str,
    token: &str,
) -> Result<RepoTree, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    // Use default branch HEAD with recursive flag to get all files
    let url = format!(
        "{}/repos/{}/{}/git/trees/HEAD?recursive=1",
        GITHUB_API, owner, repo
    );

    let tree: RepoTree = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?
        .json()
        .await?;

    Ok(tree)
}

/// Get raw file content from repository
pub async fn get_file_content(
    owner: &str,
    repo: &str,
    path: &str,
    token: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/repos/{}/{}/contents/{}",
        GITHUB_API, owner, repo, path
    );

    let content: FileContent = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .await?
        .json()
        .await?;

    // GitHub returns base64 encoded content
    if let Some(encoded) = content.content {
        // Remove newlines from base64 string
        let cleaned = encoded.replace('\n', "");
        use base64::{Engine as _, engine::general_purpose::STANDARD};
        let decoded = STANDARD.decode(&cleaned)?;
        Ok(String::from_utf8_lossy(&decoded).to_string())
    } else {
        Ok(String::new())
    }
}
