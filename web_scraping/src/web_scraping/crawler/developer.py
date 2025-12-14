"""
Developer profile extraction from various page types.
"""

import re
import logging
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse

from ..models import (
    DeveloperProfile,
    DeveloperProject,
    DeveloperExperience,
    DeveloperEducation,
    DeveloperLinks,
    DeveloperCrawlRequest,
    DeveloperCrawlResponse,
    CrawlRequest,
)
from .service import CrawlerService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DeveloperExtractor")

# Common skill keywords to look for
SKILL_KEYWORDS = [
    # Languages
    "python", "javascript", "typescript", "java", "c++", "c#", "go", "rust",
    "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl",
    # Frontend
    "react", "vue", "angular", "svelte", "next.js", "nuxt", "gatsby",
    "html", "css", "sass", "tailwind", "bootstrap", "jquery",
    # Backend
    "node.js", "express", "fastapi", "django", "flask", "spring", "rails",
    "asp.net", "laravel", "graphql", "rest api",
    # Databases
    "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "sqlite",
    "dynamodb", "firebase", "supabase",
    # Cloud/DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins",
    "github actions", "ci/cd", "linux", "nginx",
    # AI/ML
    "machine learning", "deep learning", "tensorflow", "pytorch", "keras",
    "nlp", "computer vision", "data science", "pandas", "numpy",
    # Mobile
    "react native", "flutter", "ios", "android", "swift", "kotlin",
    # Other
    "git", "agile", "scrum", "microservices", "api design",
]


def detect_page_type(url: str) -> str:
    """Detect the type of developer page from URL."""
    parsed = urlparse(url)
    domain = parsed.netloc.lower()

    if "github.com" in domain:
        return "github"
    elif "linkedin.com" in domain:
        return "linkedin"
    elif any(blog in domain for blog in ["medium.com", "dev.to", "hashnode"]):
        return "blog"
    else:
        return "portfolio"


def extract_skills_from_text(text: str) -> List[str]:
    """Extract skill keywords from text."""
    text_lower = text.lower()
    found_skills = []

    for skill in SKILL_KEYWORDS:
        # Use word boundary matching
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill.title() if len(skill) > 3 else skill.upper())

    return list(set(found_skills))


def extract_emails(text: str) -> List[str]:
    """Extract email addresses from text."""
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    return list(set(re.findall(pattern, text)))


def extract_github_links(links: List[Dict]) -> Optional[str]:
    """Find GitHub profile link."""
    for link in links:
        href = link.get("href", "")
        if "github.com/" in href and "/blob/" not in href:
            return href
    return None


def extract_linkedin_links(links: List[Dict]) -> Optional[str]:
    """Find LinkedIn profile link."""
    for link in links:
        href = link.get("href", "")
        if "linkedin.com/in/" in href:
            return href
    return None


def extract_twitter_links(links: List[Dict]) -> Optional[str]:
    """Find Twitter/X profile link."""
    for link in links:
        href = link.get("href", "")
        if "twitter.com/" in href or "x.com/" in href:
            return href
    return None


def sanitize_text(text: str) -> str:
    """Remove problematic Unicode characters for Windows compatibility."""
    if not text:
        return text
    # Replace common problematic characters
    return text.encode('utf-8', errors='ignore').decode('utf-8')


def parse_github_profile(markdown: str, text: str, links: List[Dict], url: str) -> DeveloperProfile:
    """Parse a GitHub profile page."""
    lines = text.split('\n')

    # Extract name (usually first heading)
    name = None
    for line in lines[:10]:
        line = line.strip()
        if line and not line.startswith(('Follow', 'Star', 'Fork', 'Watch')):
            if len(line) > 2 and len(line) < 50:
                name = line
                break

    # Extract bio
    bio = None
    if "README" in markdown or "readme" in markdown:
        bio_match = re.search(r'(?:##?\s*About|##?\s*Hi|##?\s*Hello)[^\n]*\n([^\n#]+)', markdown, re.I)
        if bio_match:
            bio = bio_match.group(1).strip()

    # Extract pinned repos as projects
    projects = []
    repo_pattern = r'\[([^\]]+)\]\((/[^)]+)\)'
    for match in re.finditer(repo_pattern, markdown):
        repo_name = match.group(1)
        repo_path = match.group(2)
        if repo_name and '/' not in repo_name:
            projects.append(DeveloperProject(
                name=repo_name,
                url=f"https://github.com{repo_path}" if repo_path.startswith('/') else repo_path,
            ))

    # Extract skills from README
    skills = extract_skills_from_text(text)

    # Extract links
    developer_links = DeveloperLinks(
        github=url,
        linkedin=extract_linkedin_links(links),
        twitter=extract_twitter_links(links),
    )

    emails = extract_emails(text)
    if emails:
        developer_links.email = emails[0]

    return DeveloperProfile(
        name=name,
        bio=bio,
        skills=skills[:20],  # Limit to top 20
        projects=projects[:6],  # Limit to 6 pinned repos
        links=developer_links,
        source_url=url,
        raw_text=sanitize_text(text[:5000]),
    )


def parse_portfolio_page(markdown: str, text: str, links: List[Dict], url: str) -> DeveloperProfile:
    """Parse a developer portfolio page."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]

    # Extract name (usually in title or first heading)
    name = None
    title = None

    for line in lines[:20]:
        if not name and len(line) > 2 and len(line) < 40:
            # Skip common navigation items
            if line.lower() not in ['home', 'about', 'projects', 'contact', 'blog']:
                name = line
                break

    # Look for job title patterns
    title_patterns = [
        r'((?:senior|junior|lead|principal|staff)?\s*(?:software|web|frontend|backend|full.?stack|mobile|devops|data)\s*(?:engineer|developer|architect))',
        r'((?:software|web|frontend|backend|full.?stack)\s+(?:engineer|developer))',
    ]
    for pattern in title_patterns:
        match = re.search(pattern, text, re.I)
        if match:
            title = match.group(1).strip().title()
            break

    # Extract bio (look for about section)
    bio = None
    about_match = re.search(r'(?:about\s*(?:me)?|bio|introduction)[:\s]*([^#\n]{50,500})', text, re.I)
    if about_match:
        bio = about_match.group(1).strip()

    # Extract location
    location = None
    location_match = re.search(r'(?:based in|located in|from|location:?)\s*([A-Za-z\s,]+(?:Australia|USA|UK|Canada|Germany|France|India|China|Japan)?)', text, re.I)
    if location_match:
        location = location_match.group(1).strip()

    # Extract skills
    skills = extract_skills_from_text(text)

    # Extract projects (look for project sections)
    projects = []
    project_section = re.search(r'(?:projects?|portfolio|work)[:\s]*(.+?)(?=(?:experience|education|contact|$))', text, re.I | re.S)
    if project_section:
        project_text = project_section.group(1)
        # Simple heuristic: look for titles followed by descriptions
        project_lines = [l.strip() for l in project_text.split('\n') if l.strip()]
        current_project = None
        for line in project_lines:
            if len(line) < 50 and not any(c in line for c in ['.', ',', ':']):
                if current_project:
                    projects.append(current_project)
                current_project = DeveloperProject(name=line)
            elif current_project and len(line) > 30:
                current_project.description = line[:200]

        if current_project:
            projects.append(current_project)

    # Extract experience
    experience = []
    exp_section = re.search(r'(?:experience|work history|employment)[:\s]*(.+?)(?=(?:education|projects|skills|contact|$))', text, re.I | re.S)
    if exp_section:
        exp_text = exp_section.group(1)
        # Look for patterns like "Title at Company" or "Company - Title"
        exp_patterns = [
            r'([A-Za-z\s]+)\s+(?:at|@)\s+([A-Za-z\s]+)',
            r'([A-Za-z\s]+)\s*[-–]\s*([A-Za-z\s]+)',
        ]
        for pattern in exp_patterns:
            for match in re.finditer(pattern, exp_text):
                experience.append(DeveloperExperience(
                    title=match.group(1).strip(),
                    company=match.group(2).strip(),
                ))

    # Extract links
    developer_links = DeveloperLinks(
        github=extract_github_links(links),
        linkedin=extract_linkedin_links(links),
        twitter=extract_twitter_links(links),
        portfolio=url,
    )

    emails = extract_emails(text)
    if emails:
        developer_links.email = emails[0]

    return DeveloperProfile(
        name=name,
        title=title,
        bio=bio,
        location=location,
        skills=skills[:20],
        projects=projects[:10],
        experience=experience[:5],
        links=developer_links,
        source_url=url,
        raw_text=sanitize_text(text[:5000]),
    )


class DeveloperExtractor:
    """Extract developer profiles from various page types."""

    def __init__(self, crawler_service: CrawlerService):
        self.crawler = crawler_service

    async def extract(self, request: DeveloperCrawlRequest) -> DeveloperCrawlResponse:
        """
        Extract developer profile from a URL.

        Args:
            request: Developer crawl request

        Returns:
            DeveloperCrawlResponse with extracted profile
        """
        try:
            # Detect page type if auto
            page_type = request.page_type
            if page_type == "auto":
                page_type = detect_page_type(request.url)

            logger.info(f"Extracting developer profile from {request.url} (type: {page_type})")

            # Crawl the page
            crawl_request = CrawlRequest(
                url=request.url,
                extract_links=True,
                extract_metadata=True,
            )
            crawl_result = await self.crawler.crawl(crawl_request)

            if not crawl_result.success:
                return DeveloperCrawlResponse(
                    success=False,
                    error=crawl_result.error or "Failed to crawl page",
                )

            # Parse based on page type
            links = [{"href": l.href, "text": l.text} for l in crawl_result.links]

            if page_type == "github":
                profile = parse_github_profile(
                    crawl_result.markdown or "",
                    crawl_result.text or "",
                    links,
                    request.url,
                )
            else:
                # Default to portfolio parsing
                profile = parse_portfolio_page(
                    crawl_result.markdown or "",
                    crawl_result.text or "",
                    links,
                    request.url,
                )

            return DeveloperCrawlResponse(
                success=True,
                profile=profile,
            )

        except Exception as e:
            logger.error(f"Extraction error: {e}")
            return DeveloperCrawlResponse(
                success=False,
                error=str(e),
            )

    async def extract_batch(self, urls: List[str], page_type: str = "auto") -> List[DeveloperCrawlResponse]:
        """Extract profiles from multiple URLs."""
        import asyncio
        tasks = [
            self.extract(DeveloperCrawlRequest(url=url, page_type=page_type))
            for url in urls
        ]
        return await asyncio.gather(*tasks)
