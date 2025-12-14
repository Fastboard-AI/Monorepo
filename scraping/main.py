import json
import logging
import re
import urllib.parse
import os
import tls_client
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Literal, Any

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("LinkedInScraper")

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

def _resolve_references(data: dict) -> Dict[str, dict]:
    return {e.get("entityUrn"): e for e in data.get("included", []) if e.get("entityUrn")}

def _resolve_star_field(entity: dict, urn_map: Dict[str, dict], field_name: str) -> Any:
    val = entity.get(field_name)
    if not val: return None
    if isinstance(val, list): return [urn_map.get(u) for u in val if urn_map.get(u)]
    return urn_map.get(val)

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

def url_to_public_id(url: str) -> str:
    if not url: return ""
    if "linkedin.com" not in url: return url
    path = urllib.parse.urlparse(url).path
    parts = [p for p in path.split('/') if p]
    if 'in' in parts:
        try:
            return parts[parts.index('in') + 1]
        except IndexError: pass
    return path.strip("/")

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
    
    positions = []
    if (pos_groups_urn := profile_entity.get("*profilePositionGroups")) and (group_resp := urn_map.get(pos_groups_urn)):
        for group_urn in group_resp.get("*elements", []):
            if (group := urn_map.get(group_urn)) and (pos_urns := group.get("*profilePositionInPositionGroup")):
                 if (pos_coll := urn_map.get(pos_urns)):
                    for pu in pos_coll.get("*elements", []):
                        if (p := urn_map.get(pu)): positions.append(_enrich_position(p, urn_map))

    educations = []
    if (edu_urn := profile_entity.get("*profileEducations")) and (edu_coll := urn_map.get(edu_urn)):
        for eu in edu_coll.get("*elements", []):
            if (e := urn_map.get(eu)): educations.append(_enrich_education(e, urn_map))

    return asdict(LinkedInProfile(
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
        educations=educations
    ))

def parse_search_results(json_response: dict) -> List[Dict[str, str]]:
    results = []
    for entity in json_response.get("included", []):
        if "navigationUrl" in entity and "title" in entity:
            nav_url = entity["navigationUrl"]
            if "/in/" not in nav_url: continue
            
            clean_url = nav_url.split('?')[0]
            results.append({
                "full_name": entity.get("title", {}).get("text", "Unknown"),
                "headline": entity.get("primarySubtitle", {}).get("text", ""),
                "public_identifier": url_to_public_id(clean_url),
                "url": clean_url
            })
    return results


class LinkedInAPI:
    def __init__(self, cookies_path="cookies.json"):
        self.session = tls_client.Session(
            client_identifier="chrome_120",
            random_tls_extension_order=True
        )
        
        self._load_cookies(cookies_path)
        
        jsessionid = self.session.cookies.get("JSESSIONID", "")
        self.session.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "application/vnd.linkedin.normalized+json+2.1",
            "X-Li-Lang": "en_US",
            "X-Restli-Protocol-Version": "2.0.0",
            "Csrf-Token": jsessionid.strip('"') if jsessionid else "",
            "Origin": "https://www.linkedin.com",
            "Referer": "https://www.linkedin.com/"
        }

    def _load_cookies(self, path):
        if not os.path.exists(path):
            raise FileNotFoundError(f"Cookies file {path} not found.")
        
        with open(path, 'r') as f:
            cookies = json.load(f)
            
        cookie_dict = {}
        for c in cookies:
            if "name" in c and "value" in c:
                cookie_dict[c["name"]] = c["value"]
        
        self.session.cookies.update(cookie_dict)

    def get_profile(self, profile_url: str):
        pid = url_to_public_id(profile_url)
        url = "https://www.linkedin.com/voyager/api/identity/dash/profiles"
        params = {
            'decorationId': 'com.linkedin.voyager.dash.deco.identity.profile.FullProfileWithEntities-91',
            'memberIdentity': pid,
            'q': 'memberIdentity',
        }
        
        res = self.session.get(url, params=params)
        
        if res.status_code == 999:
            raise Exception("Blocked (999). Try refreshing cookies or checking if account is restricted.")
        if res.status_code != 200:
            raise Exception(f"API Error {res.status_code}: {res.text}")
            
        return parse_linkedin_voyager_response(res.json(), public_identifier=pid)

    def get_school_urn(self, school_url: str) -> Optional[str]:
        print(f"Fetching school page: {school_url}")
        
        original_accept = self.session.headers.get("Accept")
        self.session.headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        
        try:
            res = self.session.get(school_url)
            if res.status_code == 999:
                print("   ERROR: LinkedIn blocked the HTML request (Status 999).")
                return None
                
            match = re.search(r'(urn:li:fsd_school:\d+)', res.text)
            return match.group(1) if match else None
        finally:
            if original_accept:
                self.session.headers["Accept"] = original_accept

    def get_school_alumni(self, school_urn: str, keyword: str = "", count: int = 10):
        # this isnt working atm
        url = "https://www.linkedin.com/voyager/api/search/dash/clusters"
        keyword_part = f"keywords:{keyword}," if keyword else ""
        query = (
            f"({keyword_part}"
            "flagshipSearchIntent:SEARCH_SRP,"
            "queryParameters:("
            "resultType:List(PEOPLE),"
            f"schoolFilter:List({school_urn})"
            "))"
        )
        params = {
            'decorationId': 'com.linkedin.voyager.dash.deco.search.SearchClusterCollection-174',
            'origin': 'FACETED_SEARCH',
            'q': 'all',
            'query': query,
            'start': 0,
            'count': count
        }
        
        res = self.session.get(url, params=params)
        
        if res.status_code != 200:
            print(f"Search failed: {res.status_code}")
            return []
            
        return parse_search_results(res.json())

def run():
    print("LinkedIn Scraper")
    
    try:
        api = LinkedInAPI()
        print("Cookies loaded")
    except Exception as e:
        print(f"Init Error: {e}")
        return

    while True:
        target = input("\nEnter Profile URL, School URL, or 'q': ").strip()
        if target.lower() == 'q': break
        
        try:
            if "linkedin.com/school/" in target:
                urn = api.get_school_urn(target)
                if urn:
                    kw = input("   Filter keyword: ").strip()
                    alumni = api.get_school_alumni(urn, keyword=kw, count=10)
                    print(f"\n   Found {len(alumni)} alumni.")
                    for p in alumni:
                        print(f"   - {p['full_name']} ({p['public_identifier']})")
                        
                    if alumni:
                        fname = f"alumni_{urn.split(':')[-1]}.json"
                        with open(fname, "w", encoding='utf-8') as f:
                            json.dump(alumni, f, indent=2)
                        print(f"   Saved to {fname}")
                else:
                    print("Could not find School URN.")

            elif "linkedin.com/in/" in target or "/" not in target:
                profile = api.get_profile(target)
                print(f"   Fetched: {profile['full_name']} - {profile['headline']}")
                
                fname = f"profile_{profile['public_identifier']}.json"
                with open(fname, "w", encoding='utf-8') as f:
                    json.dump(profile, f, indent=2, default=str)
                print(f"   Saved to {fname}")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    run()
