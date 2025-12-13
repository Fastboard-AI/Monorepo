import json
import logging
import time
import urllib.parse
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Literal, Any
from playwright.sync_api import sync_playwright

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("LinkedInScraper")

class AuthenticationError(Exception):
    """Raised when LinkedIn returns 401 Unauthorized."""
    pass

def url_to_public_id(url: str) -> str:
    """
    Extracts the public identifier (username) from a LinkedIn URL.
    Example: https://www.linkedin.com/in/satyanadella/ -> satyanadella
    """
    if not url:
        return ""
    
    if "linkedin.com" not in url:
        return url

    path = urllib.parse.urlparse(url).path
    parts = [p for p in path.split('/') if p]
    
    if 'in' in parts:
        try:
            index = parts.index('in')
            return parts[index + 1]
        except IndexError:
            pass
            
    return path.strip("/")


ConnectionDistance = Literal["DISTANCE_1", "DISTANCE_2", "DISTANCE_3", "OUT_OF_NETWORK", None]
DISTANCE_TO_DEGREE = {
    "DISTANCE_1": 1, "DISTANCE_2": 2, "DISTANCE_3": 3, "OUT_OF_NETWORK": None,
}

@dataclass
class Date:
    year: Optional[int] = None
    month: Optional[int] = None

@dataclass
class DateRange:
    start: Optional[Date] = None
    end: Optional[Date] = None

@dataclass
class Position:
    title: str
    company_name: str
    company_urn: Optional[str] = None
    location: Optional[str] = None
    date_range: Optional[DateRange] = None
    description: Optional[str] = None
    urn: Optional[str] = None

@dataclass
class Education:
    school_name: str
    degree_name: Optional[str] = None
    field_of_study: Optional[str] = None
    date_range: Optional[DateRange] = None
    urn: Optional[str] = None

@dataclass
class LinkedInProfile:
    url: str
    urn: str
    full_name: str
    first_name: str
    last_name: str
    headline: Optional[str] = None
    summary: Optional[str] = None
    public_identifier: Optional[str] = None
    location_name: Optional[str] = None
    geo: Optional[Dict[str, Any]] = None
    industry: Optional[Dict[str, Any]] = None
    positions: List[Position] = field(default_factory=list)
    educations: List[Education] = field(default_factory=list)
    connection_distance: Optional[ConnectionDistance] = None
    connection_degree: Optional[int] = None

def _resolve_references(data: dict) -> Dict[str, dict]:
    return {
        entity.get("entityUrn"): entity
        for entity in data.get("included", [])
        if entity.get("entityUrn")
    }

def _resolve_star_field(entity: dict, urn_map: Dict[str, dict], field_name: str) -> Any:
    value = entity.get(field_name)
    if not value: return None
    if isinstance(value, list):
        return [urn_map.get(urn) for urn in value if urn_map.get(urn)]
    return urn_map.get(value)

def _date_from_raw(raw: Optional[dict]) -> Optional[Date]:
    if not raw: return None
    return Date(year=raw.get("year"), month=raw.get("month"))

def _date_range_from_raw(raw: Optional[dict]) -> Optional[DateRange]:
    if not raw: return None
    return DateRange(start=_date_from_raw(raw.get("start")), end=_date_from_raw(raw.get("end")))

def _enrich_position(pos: dict, urn_map: Dict[str, dict]) -> Position:
    company = _resolve_star_field(pos, urn_map, "*company")
    return Position(
        title=pos.get("title") or "Unknown Title",
        company_name=company.get("name") if company else pos.get("companyName", "Unknown Company"),
        company_urn=company.get("entityUrn") if company else pos.get("companyUrn"),
        location=pos.get("locationName"),
        date_range=_date_range_from_raw(pos.get("dateRange")),
        description=pos.get("description"),
        urn=pos.get("entityUrn"),
    )

def _enrich_education(edu: dict, urn_map: Dict[str, dict]) -> Education:
    school = _resolve_star_field(edu, urn_map, "*school")
    return Education(
        school_name=school.get("name") if school else edu.get("schoolName", "Unknown School"),
        degree_name=edu.get("degreeName"),
        field_of_study=edu.get("fieldOfStudy"),
        date_range=_date_range_from_raw(edu.get("dateRange")),
        urn=edu.get("entityUrn"),
    )

def _extract_connection_info(profile_entity: dict, urn_map: Dict[str, dict]):
    member_rel_urn = profile_entity.get("*memberRelationship")
    if not member_rel_urn: return None, None
    rel = urn_map.get(member_rel_urn)
    if not rel: return None, None
    union = rel.get("memberRelationshipUnion") or rel.get("memberRelationshipData")
    if not union: return None, None
    if "connectedMember" in union or "connected" in union: return "DISTANCE_1", 1
    if "noConnection" in union:
        dist = union["noConnection"].get("memberDistance")
        return dist, DISTANCE_TO_DEGREE.get(dist)
    return None, None

def parse_linkedin_voyager_response(json_response: dict, public_identifier: Optional[str] = None) -> dict:
    urn_map = _resolve_references(json_response)
    
    profile_entity = None
    for entity in json_response.get("included", []):
        if entity.get("$type") == "com.linkedin.voyager.dash.identity.profile.Profile":
            if public_identifier is None or entity.get("publicIdentifier") == public_identifier:
                profile_entity = entity
                break
    
    if not profile_entity:
        main_urn = json_response.get("data", {}).get("*elements", [None])[0]
        profile_entity = urn_map.get(main_urn)

    if not profile_entity:
        raise ValueError("Could not find profile entity in response")

    first_name = profile_entity.get("firstName", "")
    last_name = profile_entity.get("lastName", "")
    conn_dist, conn_degree = _extract_connection_info(profile_entity, urn_map)

    positions = []
    pos_groups_urn = profile_entity.get("*profilePositionGroups")
    if pos_groups_urn:
        group_resp = urn_map.get(pos_groups_urn)
        if group_resp:
            for group_urn in group_resp.get("*elements", []):
                group = urn_map.get(group_urn)
                if not group: continue
                positions_urn = group.get("*profilePositionInPositionGroup")
                if positions_urn:
                    pos_coll = urn_map.get(positions_urn)
                    if pos_coll:
                        for pos_urn in pos_coll.get("*elements", []):
                            pos = urn_map.get(pos_urn)
                            if pos: positions.append(_enrich_position(pos, urn_map))

    educations = []
    edu_urn = profile_entity.get("*profileEducations")
    if edu_urn:
        edu_coll = urn_map.get(edu_urn)
        if edu_coll:
            for e_urn in edu_coll.get("*elements", []):
                edu = urn_map.get(e_urn)
                if edu: educations.append(_enrich_education(edu, urn_map))

    profile_obj = LinkedInProfile(
        urn=profile_entity["entityUrn"],
        first_name=first_name,
        last_name=last_name,
        full_name=f"{first_name} {last_name}".strip(),
        headline=profile_entity.get("headline"),
        summary=profile_entity.get("summary"),
        public_identifier=profile_entity.get("publicIdentifier"),
        location_name=profile_entity.get("locationName"),
        geo=_resolve_star_field(profile_entity, urn_map, "*geo"),
        industry=_resolve_star_field(profile_entity, urn_map, "*industry"),
        url=f"https://www.linkedin.com/in/{profile_entity.get('publicIdentifier', '')}/",
        positions=positions,
        educations=educations,
        connection_distance=conn_dist,
        connection_degree=conn_degree
    )
    return asdict(profile_obj)


class SimpleSession:
    """A minimal replacement for AccountSession to hold browser objects."""
    def __init__(self, page, context):
        self.page = page
        self.context = context

class PlaywrightLinkedinAPI:
    def __init__(self, session: SimpleSession):
        self.session = session
        self.page = session.page
        self.context = session.context

        # Extract JSESSIONID for CSRF
        cookies = self.context.cookies()
        cookies_dict = {c['name']: c['value'] for c in cookies}
        self.jsessionid = cookies_dict.get('JSESSIONID', '').strip('"')

        # Fingerprinting
        self.headers = self._build_headers()

    def _build_headers(self):
        # We run JS in the browser to get the exact headers matching this session
        user_agent = self.page.evaluate("navigator.userAgent")
        accept_language = self.page.evaluate("navigator.languages ? navigator.languages.join(',') : navigator.language")
        
        # Simple client hints extraction
        sec_ch_ua = self.page.evaluate("""() => {
            if (navigator.userAgentData) {
                return navigator.userAgentData.brands.map(b => `"${b.brand}";v="${b.version}"`).join(', ');
            } return '';
        }""")
        
        return {
            'accept': 'application/vnd.linkedin.normalized+json+2.1',
            'accept-language': accept_language,
            'csrf-token': self.jsessionid,
            'referer': self.page.url,
            'sec-ch-ua': sec_ch_ua,
            'user-agent': user_agent,
            'x-li-lang': 'en_US',
            'x-restli-protocol-version': '2.0.0',
        }

    def get_profile(self, public_identifier: Optional[str] = None, profile_url: Optional[str] = None):
        if not public_identifier and profile_url:
            public_identifier = url_to_public_id(profile_url)

        if not public_identifier:
            raise ValueError("Need public_identifier or profile_url")

        url = "https://www.linkedin.com/voyager/api/identity/dash/profiles"
        params = {
            'decorationId': 'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-91',
            'memberIdentity': public_identifier,
            'q': 'memberIdentity',
        }

        res = self.context.request.get(url, params=params, headers=self.headers)

        if res.status == 401:
            raise AuthenticationError("LinkedIn 401: Session Invalid.")
        if res.status == 403:
            logger.warning(f"Profile {public_identifier} is private or inaccessible.")
            return None, None
        
        if not res.ok:
            raise Exception(f"API Error {res.status}: {res.text()}")

        data = res.json()
        
        # Parse result using our local parser function
        parsed = parse_linkedin_voyager_response(data, public_identifier=public_identifier)
        return parsed, data

def run():
    print("--- LinkedIn Voyager API Scraper (Single File) ---")
    
    with sync_playwright() as p:
        # 1. Launch Browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # 2. Manual Login
        print("Navigating to login page...")
        page.goto("https://www.linkedin.com/login")
        
        print("\n" + "!"*50)
        print("ACTION REQUIRED: Log in to LinkedIn manually now.")
        print("When you are on the Feed page, press ENTER in this terminal.")
        print("!"*50 + "\n")
        input(">>> Press ENTER after login...")

        session = SimpleSession(page, context)
        api = PlaywrightLinkedinAPI(session)

        while True:
            target = input("\nEnter profile URL (or 'q' to quit): ").strip()
            if target.lower() == 'q':
                break
            
            try:
                print(f"Fetching data for {target}...")
                profile, raw = api.get_profile(profile_url=target)
                
                if profile:
                    print(f"\nName: {profile['full_name']}")
                    print(f"   Headline: {profile['headline']}")
                    print(f"   Location: {profile['location_name']}")
                    if profile['positions']:
                        print(f"   Latest Job: {profile['positions'][0]['title']} at {profile['positions'][0]['company_name']}")
                    
                    # Save to file
                    fname = f"profile_{profile['public_identifier']}.json"
                    with open(fname, "w", encoding="utf-8") as f:
                        json.dump(profile, f, indent=2, default=str)
                    print(f"   Saved to {fname}")
                else:
                    print("Could not fetch profile (Private/Blocked).")
                    
            except Exception as e:
                print(f"Error: {e}")

        browser.close()

if __name__ == "__main__":
    run()