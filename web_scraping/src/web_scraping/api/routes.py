"""
API routes for web scraping service.
Specialized for developer profiles and portfolios.
"""

from typing import List
from fastapi import APIRouter, HTTPException

from ..models import (
    CrawlRequest,
    CrawlResponse,
    DeveloperCrawlRequest,
    DeveloperCrawlResponse,
    BatchDeveloperRequest,
)
from ..crawler import CrawlerService, DeveloperExtractor
from ..crawler.service import get_crawler_service

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "fastboard-web-scraping",
        "specialization": "developer-profiles",
    }


# =============================================================================
# Developer Profile Endpoints
# =============================================================================

@router.post("/api/developer/extract", response_model=DeveloperCrawlResponse)
async def extract_developer_profile(request: DeveloperCrawlRequest):
    """
    Extract developer profile from a URL.

    Supports:
    - GitHub profiles
    - Personal portfolio sites
    - Blog pages (dev.to, medium, hashnode)

    Extracts:
    - Name, title, bio, location
    - Skills and technologies
    - Projects
    - Work experience
    - Social links (GitHub, LinkedIn, Twitter)
    """
    service = await get_crawler_service()
    extractor = DeveloperExtractor(service)
    result = await extractor.extract(request)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result


@router.post("/api/developer/batch", response_model=List[DeveloperCrawlResponse])
async def extract_developer_profiles_batch(request: BatchDeveloperRequest):
    """
    Extract developer profiles from multiple URLs.

    Processes URLs concurrently for better performance.
    """
    service = await get_crawler_service()
    extractor = DeveloperExtractor(service)
    results = await extractor.extract_batch(request.urls, request.page_type)
    return results


@router.post("/api/developer/github")
async def extract_github_profile(url: str):
    """
    Extract profile from a GitHub user page.

    Example: https://github.com/username
    """
    if "github.com" not in url:
        raise HTTPException(status_code=400, detail="URL must be a GitHub profile")

    service = await get_crawler_service()
    extractor = DeveloperExtractor(service)
    result = await extractor.extract(DeveloperCrawlRequest(url=url, page_type="github"))

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result


@router.post("/api/developer/portfolio")
async def extract_portfolio(url: str):
    """
    Extract profile from a developer portfolio site.

    Works with most personal portfolio websites.
    """
    service = await get_crawler_service()
    extractor = DeveloperExtractor(service)
    result = await extractor.extract(DeveloperCrawlRequest(url=url, page_type="portfolio"))

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result


# =============================================================================
# Generic Crawl Endpoints
# =============================================================================

@router.post("/api/crawl", response_model=CrawlResponse)
async def crawl_url(request: CrawlRequest):
    """
    Crawl a URL and extract raw content.

    Returns markdown, text, links, images, and metadata.
    Use /api/developer/extract for developer-specific extraction.
    """
    service = await get_crawler_service()
    result = await service.crawl(request)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return result


@router.post("/api/crawl/batch", response_model=List[CrawlResponse])
async def crawl_batch(urls: List[str]):
    """
    Crawl multiple URLs concurrently.

    Returns list of raw crawl results.
    """
    service = await get_crawler_service()
    results = await service.crawl_multiple(urls)
    return results


@router.post("/api/markdown")
async def get_markdown(request: CrawlRequest):
    """
    Get clean markdown content from a URL.
    """
    service = await get_crawler_service()
    result = await service.crawl(request)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return {
        "url": result.url,
        "title": result.title,
        "markdown": result.markdown,
    }


@router.post("/api/links")
async def get_links(request: CrawlRequest):
    """
    Extract all links from a URL.
    """
    request.extract_links = True
    service = await get_crawler_service()
    result = await service.crawl(request)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    return {
        "url": result.url,
        "links": result.links,
        "count": len(result.links),
    }
