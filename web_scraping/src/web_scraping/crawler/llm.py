"""
LLM-based extraction using Google Gemini.
"""

import os
import json
import logging
from typing import Optional

import google.generativeai as genai

from ..models import (
    DeveloperProfile,
    DeveloperProject,
    DeveloperExperience,
    DeveloperEducation,
    DeveloperLinks,
)

logger = logging.getLogger("LLMExtractor")

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

EXTRACTION_PROMPT = """You are extracting developer profile information from a webpage.

Analyze the following content and extract relevant information into a JSON object.

Content:
{content}

Extract the following fields (use null if not found):
- name: The developer's full name
- title: Their job title (e.g., "Senior Software Engineer")
- bio: A brief bio or summary about them
- location: Where they are based
- skills: List of technical skills (programming languages, frameworks, tools)
- projects: List of projects with name, description, url, technologies
- experience: List of work experience with title, company, duration, description
- education: List of education with degree, institution, year, field
- links: Object with github, linkedin, twitter, portfolio, blog, email, resume URLs

Output ONLY valid JSON matching this schema:
{{
    "name": "string or null",
    "title": "string or null",
    "bio": "string or null",
    "location": "string or null",
    "skills": ["string"],
    "projects": [{{"name": "string", "description": "string or null", "url": "string or null", "technologies": ["string"]}}],
    "experience": [{{"title": "string", "company": "string or null", "duration": "string or null", "description": "string or null"}}],
    "education": [{{"degree": "string or null", "institution": "string or null", "year": "string or null", "field": "string or null"}}],
    "links": {{
        "github": "string or null",
        "linkedin": "string or null",
        "twitter": "string or null",
        "portfolio": "string or null",
        "blog": "string or null",
        "email": "string or null",
        "resume": "string or null"
    }}
}}
"""


async def extract_with_llm(
    content: str,
    source_url: str,
) -> Optional[DeveloperProfile]:
    """
    Extract developer profile using Gemini LLM.

    Args:
        content: Raw text/markdown content from the page
        source_url: The URL the content was scraped from

    Returns:
        DeveloperProfile or None if extraction fails
    """
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not set")
        return None

    try:
        # Truncate content if too long (Gemini has context limits)
        max_content_length = 30000
        if len(content) > max_content_length:
            content = content[:max_content_length]

        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = EXTRACTION_PROMPT.format(content=content)

        response = await model.generate_content_async(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        # Parse the JSON response
        response_text = response.text.strip()

        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        data = json.loads(response_text)

        # Build the profile from extracted data
        projects = []
        for p in data.get("projects", []) or []:
            if p and p.get("name"):
                projects.append(DeveloperProject(
                    name=p["name"],
                    description=p.get("description"),
                    url=p.get("url"),
                    technologies=p.get("technologies", []),
                ))

        experience = []
        for e in data.get("experience", []) or []:
            if e and e.get("title"):
                experience.append(DeveloperExperience(
                    title=e["title"],
                    company=e.get("company"),
                    duration=e.get("duration"),
                    description=e.get("description"),
                ))

        education = []
        for ed in data.get("education", []) or []:
            if ed and (ed.get("degree") or ed.get("institution")):
                education.append(DeveloperEducation(
                    degree=ed.get("degree"),
                    institution=ed.get("institution"),
                    year=ed.get("year"),
                    field=ed.get("field"),
                ))

        links_data = data.get("links", {}) or {}
        links = DeveloperLinks(
            github=links_data.get("github"),
            linkedin=links_data.get("linkedin"),
            twitter=links_data.get("twitter"),
            portfolio=links_data.get("portfolio") or source_url,
            blog=links_data.get("blog"),
            email=links_data.get("email"),
            resume=links_data.get("resume"),
        )

        return DeveloperProfile(
            name=data.get("name"),
            title=data.get("title"),
            bio=data.get("bio"),
            location=data.get("location"),
            skills=(data.get("skills") or [])[:20],  # Limit to 20 skills
            projects=projects[:10],  # Limit to 10 projects
            experience=experience[:10],  # Limit to 10 experiences
            education=education[:5],  # Limit to 5 education entries
            links=links,
            source_url=source_url,
            raw_text=content[:5000],  # Store truncated raw text
        )

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM JSON response: {e}")
        return None
    except Exception as e:
        logger.error(f"LLM extraction error: {e}")
        return None
