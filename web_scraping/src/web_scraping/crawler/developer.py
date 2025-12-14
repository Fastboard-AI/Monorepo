"""
Developer profile extraction using LLM.
"""

import logging
from typing import List

from ..models import (
    DeveloperProfile,
    DeveloperLinks,
    DeveloperCrawlRequest,
    DeveloperCrawlResponse,
    CrawlRequest,
)
from .service import CrawlerService
from .llm import extract_with_llm

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DeveloperExtractor")


def sanitize_text(text: str) -> str:
    """Remove problematic Unicode characters for Windows compatibility."""
    if not text:
        return text
    return text.encode('utf-8', errors='ignore').decode('utf-8')


class DeveloperExtractor:
    """Extract developer profiles from various page types using LLM."""

    def __init__(self, crawler_service: CrawlerService):
        self.crawler = crawler_service

    async def extract(self, request: DeveloperCrawlRequest) -> DeveloperCrawlResponse:
        """
        Extract developer profile from a URL using LLM.

        Args:
            request: Developer crawl request

        Returns:
            DeveloperCrawlResponse with extracted profile
        """
        try:
            logger.info(f"Extracting developer profile from {request.url}")

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

            # Combine markdown and metadata for better context
            content_parts = []

            if crawl_result.title:
                content_parts.append(f"Page Title: {crawl_result.title}")

            if crawl_result.markdown:
                content_parts.append(crawl_result.markdown)
            elif crawl_result.text:
                content_parts.append(crawl_result.text)

            # Add links context
            if crawl_result.links:
                links_text = "\n".join([
                    f"- {l.text}: {l.href}" if l.text else f"- {l.href}"
                    for l in crawl_result.links[:50]  # Limit links
                ])
                content_parts.append(f"\nLinks found on page:\n{links_text}")

            content = sanitize_text("\n\n".join(content_parts))

            if not content or len(content) < 100:
                return DeveloperCrawlResponse(
                    success=False,
                    error="Page has insufficient content to extract profile",
                )

            # Extract using LLM
            profile = await extract_with_llm(content, request.url)

            if not profile:
                # Fallback: return minimal profile with raw content
                profile = DeveloperProfile(
                    links=DeveloperLinks(portfolio=request.url),
                    source_url=request.url,
                    raw_text=content[:5000],
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
