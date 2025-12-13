from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class Date(BaseModel):
    year: Optional[int] = None
    month: Optional[int] = None


class DateRange(BaseModel):
    start: Optional[Date] = None
    end: Optional[Date] = None


class Position(BaseModel):
    title: str
    company_name: str
    company_urn: Optional[str] = None
    location: Optional[str] = None
    date_range: Optional[DateRange] = None
    description: Optional[str] = None
    urn: Optional[str] = None


class Education(BaseModel):
    school_name: str
    degree_name: Optional[str] = None
    field_of_study: Optional[str] = None
    date_range: Optional[DateRange] = None
    urn: Optional[str] = None


ConnectionDistance = Literal["SELF", "DISTANCE_1", "DISTANCE_2", "DISTANCE_3", "OUT_OF_NETWORK"]


class LinkedInProfile(BaseModel):
    urn: str
    first_name: str
    last_name: str
    full_name: str
    headline: Optional[str] = None
    summary: Optional[str] = None
    public_identifier: Optional[str] = None
    location_name: Optional[str] = None
    geo: Optional[dict] = None
    industry: Optional[dict] = None
    url: Optional[str] = None
    positions: List[Position] = Field(default_factory=list)
    educations: List[Education] = Field(default_factory=list)
    connection_distance: Optional[ConnectionDistance] = None
    connection_degree: Optional[int] = None


class ProfileSearchResult(BaseModel):
    href: str
    title: Optional[str] = None
    description: Optional[str] = None


class SearchTarget(BaseModel):
    role: str
    location: str
    filter_by_uni: bool = False
    timeframe: Literal["d", "w", "m", "y"] = "m"


class ScrapeRequest(BaseModel):
    profile_url: str


class SearchRequest(BaseModel):
    targets: List[SearchTarget]
