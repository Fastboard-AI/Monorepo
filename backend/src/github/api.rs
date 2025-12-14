use serde::{Deserialize, Serialize};

const GITHUB_API: &str = "https://api.github.com";

#[derive(Deserialize)]
pub struct GitHubRepo {
    pub name: String,
    pub owner: RepoOwner,
    pub fork: bool,
}

#[derive(Deserialize, Serialize, Clone)]
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

// Extended repo data for full analysis
#[derive(Deserialize, Serialize, Clone)]
pub struct GitHubRepoFull {
    pub name: String,
    pub owner: RepoOwner,
    pub fork: bool,
    pub description: Option<String>,
    pub stargazers_count: u32,
    pub forks_count: u32,
    pub watchers_count: u32,
    pub language: Option<String>,
    pub size: u32,
    pub created_at: String,
    pub updated_at: String,
}

// GitHub user profile
#[derive(Deserialize, Serialize, Clone)]
pub struct GitHubUser {
    pub login: String,
    pub name: Option<String>,
    pub bio: Option<String>,
    pub avatar_url: String,
    pub public_repos: u32,
    pub followers: u32,
    pub following: u32,
    pub created_at: String,
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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
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

/// Get user profile data
pub async fn get_user_profile(
    username: &str,
    token: &str,
) -> Result<GitHubUser, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = format!("{}/users/{}", GITHUB_API, username);

    let user: GitHubUser = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?
        .json()
        .await?;

    Ok(user)
}

/// Get all user repos with full metadata (including forks)
pub async fn get_user_repos_full(
    username: &str,
    token: &str,
) -> Result<Vec<GitHubRepoFull>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = format!("{}/users/{}/repos?sort=updated&per_page=30", GITHUB_API, username);

    let repos: Vec<GitHubRepoFull> = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?
        .json()
        .await?;

    Ok(repos)
}

/// Get commit count for a user in a specific repo
pub async fn get_repo_commit_count(
    owner: &str,
    repo: &str,
    author: &str,
    token: &str,
) -> Result<u32, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let url = format!(
        "{}/repos/{}/{}/commits?author={}&per_page=100",
        GITHUB_API, owner, repo, author
    );

    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "FastboardAI")
        .send()
        .await?;

    let commits: Vec<GitHubCommit> = response.json().await.unwrap_or_default();
    Ok(commits.len() as u32)
}

/// Get ALL user repos with full metadata (paginated)
/// Fetches up to 1000 repos (10 pages of 100)
pub async fn get_all_user_repos(
    username: &str,
    token: &str,
) -> Result<Vec<GitHubRepoFull>, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();
    let mut all_repos = Vec::new();
    let mut page = 1;

    loop {
        let url = format!(
            "{}/users/{}/repos?sort=updated&per_page=100&page={}",
            GITHUB_API, username, page
        );

        let response = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token))
            .header("User-Agent", "FastboardAI")
            .send()
            .await?;

        let repos: Vec<GitHubRepoFull> = response.json().await.unwrap_or_default();

        if repos.is_empty() {
            break;
        }

        all_repos.extend(repos);
        page += 1;

        // Max 10 pages (1000 repos) and rate limit protection
        if page > 10 {
            break;
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    Ok(all_repos)
}

/// Attempt to fetch README content from a repository
/// Tries common README filename variations
pub async fn get_readme_content(
    owner: &str,
    repo: &str,
    token: &str,
) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
    let readme_files = ["README.md", "README", "readme.md", "readme", "Readme.md"];

    for filename in readme_files {
        if let Ok(content) = get_file_content(owner, repo, filename, token).await {
            if !content.is_empty() {
                return Ok(Some(content));
            }
        }
    }

    Ok(None)
}
