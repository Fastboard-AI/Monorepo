"""
FastboardAI LinkedIn Scraping Service

Usage:
    # Search only (no browser needed)
    uv run uvicorn scraping.main:app --reload --port 8001

    # With browser for profile scraping
    uv run python -m scraping.main --with-browser
"""

import os
import sys
import argparse
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .api import router
from .api.routes import set_scraper_session

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("Scraping service starting...")
    yield
    print("Scraping service shutting down...")


app = FastAPI(
    title="FastboardAI Scraping Service",
    description="LinkedIn profile scraping and search API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="FastboardAI Scraping Service")
    parser.add_argument(
        "--with-browser",
        action="store_true",
        help="Start with browser for LinkedIn profile scraping"
    )
    parser.add_argument(
        "--host",
        default=os.getenv("HOST", "0.0.0.0"),
        help="Host to bind to"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", "8001")),
        help="Port to bind to"
    )

    args = parser.parse_args()

    if args.with_browser:
        # Start with browser session
        from .scrapers import LinkedInScraper

        print("Starting browser session...")
        scraper, browser, playwright = LinkedInScraper.start_session(headless=False)
        set_scraper_session(scraper)

        try:
            uvicorn.run(app, host=args.host, port=args.port)
        finally:
            print("Closing browser...")
            browser.close()
            playwright.stop()
    else:
        # Search-only mode
        print("Starting in search-only mode (no LinkedIn profile scraping)")
        uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
