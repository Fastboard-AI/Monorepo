"""
FastboardAI Web Scraping Service using Crawl4AI

Usage:
    uv run uvicorn web_scraping.main:app --reload --port 8002
"""

import os
import argparse
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .api import router
from .crawler.service import close_crawler_service

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    print("Web scraping service starting...")
    yield
    print("Web scraping service shutting down...")
    await close_crawler_service()


app = FastAPI(
    title="FastboardAI Web Scraping Service",
    description="Web scraping API using Crawl4AI",
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
    parser = argparse.ArgumentParser(description="FastboardAI Web Scraping Service")
    parser.add_argument(
        "--host",
        default=os.getenv("HOST", "0.0.0.0"),
        help="Host to bind to"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("PORT", "8002")),
        help="Port to bind to"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload"
    )

    args = parser.parse_args()
    uvicorn.run(
        "web_scraping.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
