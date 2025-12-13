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

pub async fn get_user_repos(
    username: &str,
    token: &str,
) -> Result<Vec<GitHubRepo>, Box<dyn std::error::Error>> {
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
