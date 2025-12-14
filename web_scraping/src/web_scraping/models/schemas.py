from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class CrawlRequest(BaseModel):
    """Request to crawl a URL."""
    url: str = Field(..., description="URL to crawl")
    extract_links: bool = Field(default=True, description="Extract links from page")
    extract_images: bool = Field(default=False, description="Extract images from page")
    extract_metadata: bool = Field(default=True, description="Extract page metadata")
    wait_for: Optional[str] = Field(default=None, description="CSS selector to wait for")
    timeout: int = Field(default=30000, description="Timeout in milliseconds")
    headless: bool = Field(default=True, description="Run browser in headless mode")


class LinkInfo(BaseModel):
    """Information about a link."""
    href: str
    text: Optional[str] = None
    title: Optional[str] = None


class ImageInfo(BaseModel):
    """Information about an image."""
    src: str
    alt: Optional[str] = None
    title: Optional[str] = None


class CrawlResponse(BaseModel):
    """Response from crawling a URL."""
    success: bool
    url: str
    title: Optional[str] = None
    markdown: Optional[str] = None
    text: Optional[str] = None
    html: Optional[str] = None
    links: List[LinkInfo] = Field(default_factory=list)
    images: List[ImageInfo] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


# Developer Profile Models

class DeveloperProject(BaseModel):
    """A project from a developer's portfolio."""
    name: str
    description: Optional[str] = None
    url: Optional[str] = None
    repo_url: Optional[str] = None
    technologies: List[str] = Field(default_factory=list)
    image_url: Optional[str] = None


class DeveloperExperience(BaseModel):
    """Work experience entry."""
    title: str
    company: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None


class DeveloperEducation(BaseModel):
    """Education entry."""
    degree: Optional[str] = None
    institution: Optional[str] = None
    year: Optional[str] = None
    field: Optional[str] = None


class DeveloperLinks(BaseModel):
    """Social and professional links."""
    github: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    portfolio: Optional[str] = None
    blog: Optional[str] = None
    email: Optional[str] = None
    resume: Optional[str] = None


class DeveloperProfile(BaseModel):
    """Extracted developer profile."""
    name: Optional[str] = None
    title: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    projects: List[DeveloperProject] = Field(default_factory=list)
    experience: List[DeveloperExperience] = Field(default_factory=list)
    education: List[DeveloperEducation] = Field(default_factory=list)
    links: DeveloperLinks = Field(default_factory=DeveloperLinks)
    source_url: str
    raw_text: Optional[str] = None


class DeveloperCrawlRequest(BaseModel):
    """Request to crawl a developer's page."""
    url: str = Field(..., description="Developer page URL (portfolio, GitHub, etc)")
    page_type: Literal["portfolio", "github", "linkedin", "blog", "auto"] = Field(
        default="auto", description="Type of page to help with extraction"
    )
    extract_projects: bool = Field(default=True, description="Extract project information")
    extract_experience: bool = Field(default=True, description="Extract work experience")
    extract_skills: bool = Field(default=True, description="Extract skills/technologies")


class DeveloperCrawlResponse(BaseModel):
    """Response from developer page crawl."""
    success: bool
    profile: Optional[DeveloperProfile] = None
    error: Optional[str] = None


class BatchDeveloperRequest(BaseModel):
    """Request to crawl multiple developer pages."""
    urls: List[str] = Field(..., description="List of developer page URLs")
    page_type: Literal["portfolio", "github", "linkedin", "blog", "auto"] = Field(
        default="auto", description="Type of pages"
    )


class ExtractRequest(BaseModel):
    """Request to extract structured data from a URL."""
    url: str = Field(..., description="URL to extract data from")
    schema: Dict[str, Any] = Field(..., description="JSON schema for extraction")


class ExtractResponse(BaseModel):
    """Response from structured extraction."""
    success: bool
    url: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
