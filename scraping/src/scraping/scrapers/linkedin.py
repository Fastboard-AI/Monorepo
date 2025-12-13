"""
LinkedIn Profile Scraper using Playwright.
Requires manual login via browser.
"""

import json
import logging
import urllib.parse
from typing import Optional, Dict, Any, Tuple

from playwright.sync_api import sync_playwright, Page, BrowserContext

from ..models import LinkedInProfile, Position, Education, Date, DateRange

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("LinkedInScraper")


class AuthenticationError(Exception):
    """Raised when LinkedIn returns 401 Unauthorized."""
    pass


def url_to_public_id(url: str) -> str:
    """Extract public identifier from LinkedIn URL."""
    if not url:
        return ""

    if "/in/" in url:
        parts = url.split("/in/")
        if len(parts) > 1:
            return parts[1].strip("/").split("?")[0]
    return url


def _resolve_references(data: dict) -> Dict[str, dict]:
    """Build URN -> entity map from included entities."""
    return {
        entity.get("entityUrn"): entity
        for entity in data.get("included", [])
        if entity.get("entityUrn")
    }


def _resolve_star_field(entity: dict, urn_map: Dict[str, dict], field_name: str) -> Any:
    """Resolve *field references to actual entities."""
    value = entity.get(field_name)
    if not value:
        return None
    if isinstance(value, list):
        return [urn_map.get(urn) for urn in value if urn_map.get(urn)]
    return urn_map.get(value)


def _date_from_raw(raw: Optional[dict]) -> Optional[Dict]:
    """Convert raw date to Date dict."""
    if not raw:
        return None
    return {"year": raw.get("year"), "month": raw.get("month")}


def _date_range_from_raw(raw: Optional[dict]) -> Optional[Dict]:
    """Convert raw date range to DateRange dict."""
    if not raw:
        return None
    return {
        "start": _date_from_raw(raw.get("start")),
        "end": _date_from_raw(raw.get("end"))
    }


def _enrich_position(pos: dict, urn_map: Dict[str, dict]) -> Dict:
    """Enrich position with resolved company data."""
    company = _resolve_star_field(pos, urn_map, "*company")
    return {
        "title": pos.get("title") or "Unknown Title",
        "company_name": company.get("name") if company else pos.get("companyName", "Unknown Company"),
        "company_urn": company.get("entityUrn") if company else pos.get("companyUrn"),
        "location": pos.get("locationName"),
        "date_range": _date_range_from_raw(pos.get("dateRange")),
        "description": pos.get("description"),
        "urn": pos.get("entityUrn"),
    }


def _enrich_education(edu: dict, urn_map: Dict[str, dict]) -> Dict:
    """Enrich education with resolved school data."""
    school = _resolve_star_field(edu, urn_map, "*school")
    return {
        "school_name": school.get("name") if school else edu.get("schoolName", "Unknown School"),
        "degree_name": edu.get("degreeName"),
        "field_of_study": edu.get("fieldOfStudy"),
        "date_range": _date_range_from_raw(edu.get("dateRange")),
        "urn": edu.get("entityUrn"),
    }


def _extract_connection_info(profile_entity: dict, urn_map: Dict[str, dict]) -> Tuple[Optional[str], Optional[int]]:
    """Extract connection distance and degree."""
    member_rel_urn = profile_entity.get("*memberRelationship")
    if not member_rel_urn:
        return None, None

    rel = urn_map.get(member_rel_urn)
    if not rel:
        return None, None

    union = rel.get("memberRelationshipUnion") or rel.get("memberRelationshipData")
    if not union:
        return None, None

    distance = union.get("distance")
    degree = None

    if distance == "DISTANCE_1":
        degree = 1
    elif distance == "DISTANCE_2":
        degree = 2
    elif distance == "DISTANCE_3":
        degree = 3

    return distance, degree


def parse_profile_response(data: dict) -> Optional[Dict]:
    """Parse LinkedIn API response into profile dict."""
    urn_map = _resolve_references(data)

    # Find main profile entity
    profile_entity = None
    for entity in data.get("included", []):
        urn = entity.get("entityUrn", "")
        if urn.startswith("urn:li:fs_profile:") or urn.startswith("urn:li:fsd_profile:"):
            if entity.get("firstName"):
                profile_entity = entity
                break

    if not profile_entity:
        return None

    first_name = profile_entity.get("firstName", "")
    last_name = profile_entity.get("lastName", "")

    # Get positions
    positions = []
    positions_view = _resolve_star_field(profile_entity, urn_map, "*profilePositionGroups")
    if positions_view:
        for group in positions_view:
            group_positions = _resolve_star_field(group, urn_map, "*profilePositionInPositionGroup")
            if group_positions:
                for pos in group_positions:
                    positions.append(_enrich_position(pos, urn_map))

    # Get educations
    educations = []
    edu_view = _resolve_star_field(profile_entity, urn_map, "*profileEducations")
    if edu_view:
        for edu in edu_view:
            educations.append(_enrich_education(edu, urn_map))

    # Get connection info
    conn_dist, conn_degree = _extract_connection_info(profile_entity, urn_map)

    return {
        "urn": profile_entity["entityUrn"],
        "first_name": first_name,
        "last_name": last_name,
        "full_name": f"{first_name} {last_name}".strip(),
        "headline": profile_entity.get("headline"),
        "summary": profile_entity.get("summary"),
        "public_identifier": profile_entity.get("publicIdentifier"),
        "location_name": profile_entity.get("locationName"),
        "geo": _resolve_star_field(profile_entity, urn_map, "*geo"),
        "industry": _resolve_star_field(profile_entity, urn_map, "*industry"),
        "url": f"https://www.linkedin.com/in/{profile_entity.get('publicIdentifier', '')}/",
        "positions": positions,
        "educations": educations,
        "connection_distance": conn_dist,
        "connection_degree": conn_degree,
    }


class LinkedInScraper:
    """LinkedIn profile scraper using Playwright browser automation."""

    def __init__(self, page: Page, context: BrowserContext):
        self.page = page
        self.context = context
        self._setup_headers()

    def _setup_headers(self):
        """Extract session cookies and build request headers."""
        cookies = self.context.cookies()
        cookies_dict = {c['name']: c['value'] for c in cookies}
        self.jsessionid = cookies_dict.get('JSESSIONID', '').strip('"')

        # Get browser fingerprint
        user_agent = self.page.evaluate("navigator.userAgent")
        accept_language = self.page.evaluate(
            "navigator.languages ? navigator.languages.join(',') : navigator.language"
        )

        self.headers = {
            "accept": "application/vnd.linkedin.normalized+json+2.1",
            "accept-language": accept_language,
            "csrf-token": self.jsessionid,
            "user-agent": user_agent,
            "x-restli-protocol-version": "2.0.0",
        }

    def get_profile(self, profile_url: str) -> Tuple[Optional[Dict], Optional[Dict]]:
        """
        Fetch a LinkedIn profile by URL.

        Returns:
            Tuple of (parsed_profile, raw_response)
        """
        public_id = url_to_public_id(profile_url)
        if not public_id:
            logger.error(f"Could not extract public ID from URL: {profile_url}")
            return None, None

        # Build API URL
        api_url = (
            f"https://www.linkedin.com/voyager/api/identity/dash/profiles"
            f"?q=memberIdentity&memberIdentity={public_id}"
            f"&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-19"
        )

        # Make request via page context
        response = self.page.evaluate(
            """async (config) => {
                const resp = await fetch(config.url, {
                    method: 'GET',
                    headers: config.headers,
                    credentials: 'include'
                });

                if (resp.status === 401) {
                    throw new Error('AUTH_ERROR');
                }

                if (!resp.ok) {
                    return { error: resp.status };
                }

                return await resp.json();
            }""",
            {"url": api_url, "headers": self.headers}
        )

        if isinstance(response, dict) and response.get("error"):
            if response["error"] == 401:
                raise AuthenticationError("LinkedIn session expired")
            logger.error(f"API error: {response['error']}")
            return None, None

        parsed = parse_profile_response(response)
        return parsed, response

    @staticmethod
    def start_session(headless: bool = False):
        """
        Start a new scraping session with manual login.

        Returns:
            Tuple of (scraper, browser, playwright)
        """
        playwright = sync_playwright().start()
        browser = playwright.chromium.launch(headless=headless)
        context = browser.new_context()
        page = context.new_page()

        # Navigate to login
        page.goto("https://www.linkedin.com/login")

        print("\n" + "!" * 50)
        print("ACTION REQUIRED: Log in to LinkedIn manually.")
        print("When you are on the Feed page, press ENTER.")
        print("!" * 50 + "\n")
        input(">>> Press ENTER after login...")

        scraper = LinkedInScraper(page, context)
        return scraper, browser, playwright
