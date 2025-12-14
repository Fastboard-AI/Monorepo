"""
Web crawling service using Crawl4AI.
"""

import asyncio
import logging
from typing import Optional, Dict, Any, List

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy, LLMExtractionStrategy

from ..models import (
    CrawlRequest,
    CrawlResponse,
    ExtractRequest,
    ExtractResponse,
    LinkInfo,
    ImageInfo,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("CrawlerService")


class CrawlerService:
    """Service for crawling web pages using Crawl4AI."""

    def __init__(self):
        self._crawler: Optional[AsyncWebCrawler] = None

    async def _get_crawler(self, headless: bool = True) -> AsyncWebCrawler:
        """Get or create crawler instance."""
        if self._crawler is None:
            browser_config = BrowserConfig(
                headless=headless,
                verbose=False,
            )
            self._crawler = AsyncWebCrawler(config=browser_config)
            await self._crawler.start()
        return self._crawler

    async def close(self):
        """Close the crawler."""
        if self._crawler:
            await self._crawler.close()
            self._crawler = None

    async def crawl(self, request: CrawlRequest) -> CrawlResponse:
        """
        Crawl a URL and extract content.

        Args:
            request: Crawl request parameters

        Returns:
            CrawlResponse with extracted content
        """
        try:
            crawler = await self._get_crawler(headless=request.headless)

            run_config = CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                wait_for=request.wait_for,
                page_timeout=request.timeout,
            )

            result = await crawler.arun(
                url=request.url,
                config=run_config,
            )

            if not result.success:
                return CrawlResponse(
                    success=False,
                    url=request.url,
                    error=result.error_message or "Failed to crawl URL",
                )

            # Extract links
            links: List[LinkInfo] = []
            if request.extract_links and result.links:
                for link in result.links.get("internal", []) + result.links.get("external", []):
                    if isinstance(link, dict):
                        links.append(LinkInfo(
                            href=link.get("href", ""),
                            text=link.get("text"),
                            title=link.get("title"),
                        ))
                    elif isinstance(link, str):
                        links.append(LinkInfo(href=link))

            # Extract images
            images: List[ImageInfo] = []
            if request.extract_images and result.media:
                for img in result.media.get("images", []):
                    if isinstance(img, dict):
                        images.append(ImageInfo(
                            src=img.get("src", ""),
                            alt=img.get("alt"),
                            title=img.get("title"),
                        ))

            # Extract metadata
            metadata: Dict[str, Any] = {}
            if request.extract_metadata and result.metadata:
                metadata = result.metadata

            # Get text content - derive from markdown if text not available
            text_content = None
            if hasattr(result, 'text') and result.text:
                text_content = result.text
            elif hasattr(result, 'markdown') and result.markdown:
                # Strip markdown formatting to get plain text
                import re
                text_content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', result.markdown)  # Remove links
                text_content = re.sub(r'[#*_`~]', '', text_content)  # Remove formatting

            # Get HTML content
            html_content = None
            if hasattr(result, 'html') and result.html:
                html_content = result.html
            elif hasattr(result, 'cleaned_html') and result.cleaned_html:
                html_content = result.cleaned_html

            return CrawlResponse(
                success=True,
                url=request.url,
                title=result.metadata.get("title") if result.metadata else None,
                markdown=result.markdown if hasattr(result, 'markdown') else None,
                text=text_content,
                html=html_content,
                links=links,
                images=images,
                metadata=metadata,
            )

        except Exception as e:
            logger.error(f"Crawl error: {e}")
            return CrawlResponse(
                success=False,
                url=request.url,
                error=str(e),
            )

    async def extract_structured(self, request: ExtractRequest) -> ExtractResponse:
        """
        Extract structured data from a URL using a schema.

        Args:
            request: Extraction request with schema

        Returns:
            ExtractResponse with extracted data
        """
        try:
            crawler = await self._get_crawler()

            # Use CSS extraction strategy
            extraction_strategy = JsonCssExtractionStrategy(
                schema=request.schema,
                verbose=False,
            )

            run_config = CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                extraction_strategy=extraction_strategy,
            )

            result = await crawler.arun(
                url=request.url,
                config=run_config,
            )

            if not result.success:
                return ExtractResponse(
                    success=False,
                    url=request.url,
                    error=result.error_message or "Failed to extract data",
                )

            # Parse extracted content
            extracted_data = None
            if result.extracted_content:
                import json
                try:
                    extracted_data = json.loads(result.extracted_content)
                except json.JSONDecodeError:
                    extracted_data = {"raw": result.extracted_content}

            return ExtractResponse(
                success=True,
                url=request.url,
                data=extracted_data,
            )

        except Exception as e:
            logger.error(f"Extraction error: {e}")
            return ExtractResponse(
                success=False,
                url=request.url,
                error=str(e),
            )

    async def crawl_multiple(self, urls: List[str], **kwargs) -> List[CrawlResponse]:
        """Crawl multiple URLs concurrently."""
        tasks = [
            self.crawl(CrawlRequest(url=url, **kwargs))
            for url in urls
        ]
        return await asyncio.gather(*tasks)


# Global instance
_crawler_service: Optional[CrawlerService] = None


async def get_crawler_service() -> CrawlerService:
    """Get or create global crawler service."""
    global _crawler_service
    if _crawler_service is None:
        _crawler_service = CrawlerService()
    return _crawler_service


async def close_crawler_service():
    """Close global crawler service."""
    global _crawler_service
    if _crawler_service:
        await _crawler_service.close()
        _crawler_service = None
