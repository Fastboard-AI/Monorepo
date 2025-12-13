"""
API routes for LinkedIn scraping service.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..models import (
    LinkedInProfile,
    ProfileSearchResult,
    ScrapeRequest,
    SearchRequest,
    SearchTarget,
)
from ..scrapers import ProfileSearcher, ProfileDatabase

router = APIRouter()

# Global scraper session (set via /session/start)
_scraper_session = None


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "fastboard-scraping",
        "session_active": _scraper_session is not None,
    }


@router.post("/api/search/profiles", response_model=List[ProfileSearchResult])
async def search_profiles(request: SearchRequest):
    """
    Search for LinkedIn profiles using DuckDuckGo.

    This doesn't require LinkedIn authentication.
    Results are saved to local SQLite database.
    """
    searcher = ProfileSearcher()

    for target in request.targets:
        searcher.add_target(
            role=target.role,
            location=target.location,
            filter_by_uni=target.filter_by_uni,
            timeframe=target.timeframe,
        )

    results = searcher.search(save_to_db=True)
    return results


@router.post("/api/search/single", response_model=List[ProfileSearchResult])
async def search_single(target: SearchTarget):
    """Search for profiles with a single target."""
    searcher = ProfileSearcher()
    results = searcher.search_single(target)
    return results


@router.get("/api/profiles", response_model=List[dict])
async def get_stored_profiles():
    """Get all profiles stored in local database."""
    db = ProfileDatabase()
    profiles = db.get_all_profiles()
    db.close()
    return profiles


@router.post("/api/scrape/profile")
async def scrape_profile(request: ScrapeRequest):
    """
    Scrape a single LinkedIn profile.

    Requires an active browser session (start via CLI).
    """
    global _scraper_session

    if not _scraper_session:
        raise HTTPException(
            status_code=503,
            detail="No active scraping session. Start the service with --with-browser flag."
        )

    try:
        profile, raw = _scraper_session.get_profile(request.profile_url)

        if not profile:
            raise HTTPException(
                status_code=404,
                detail="Could not fetch profile. It may be private or blocked."
            )

        return {
            "success": True,
            "profile": profile,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/session/status")
async def session_status():
    """Check if browser session is active."""
    return {
        "active": _scraper_session is not None,
        "message": "Browser session is active" if _scraper_session else "No active session"
    }


def set_scraper_session(scraper):
    """Set the global scraper session (called from main)."""
    global _scraper_session
    _scraper_session = scraper
