"""
LinkedIn profile discovery via DuckDuckGo search.
"""

import time
import sqlite3
import logging
from typing import List, Optional, Literal
from pathlib import Path

from duckduckgo_search import DDGS

from ..models import SearchTarget, ProfileSearchResult

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ProfileSearcher")


# Australian universities for filtering
AUSTRALIAN_UNIS = [
    "University of Sydney", "UNSW", "University of Melbourne",
    "Monash University", "University of Queensland", "ANU",
    "University of Western Australia", "University of Adelaide",
    "UTS", "Macquarie University", "RMIT", "Deakin University",
    "Griffith University", "University of Wollongong",
    "Queensland University of Technology", "Curtin University",
    "La Trobe University", "Swinburne", "Western Sydney University",
]


class ProfileDatabase:
    """SQLite database for storing discovered profiles."""

    def __init__(self, db_path: str = "linkedin_profiles.db"):
        self.db_path = db_path
        self.connection = sqlite3.connect(db_path)
        self._create_table()

    def _create_table(self):
        with self.connection:
            self.connection.execute('''
                CREATE TABLE IF NOT EXISTS profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    href TEXT UNIQUE,
                    title TEXT,
                    description TEXT,
                    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

    def save_results(self, results: List[ProfileSearchResult]) -> int:
        """Save search results to database. Returns count of new profiles."""
        count = 0
        for result in results:
            if result.href and "linkedin.com/in/" in result.href:
                try:
                    with self.connection:
                        self.connection.execute('''
                            INSERT OR IGNORE INTO profiles (href, title, description)
                            VALUES (?, ?, ?)
                        ''', (result.href, result.title, result.description))
                        if self.connection.total_changes > 0:
                            count += 1
                except sqlite3.Error as e:
                    logger.error(f"Database error: {e}")
        return count

    def get_all_profiles(self) -> List[dict]:
        """Get all stored profiles."""
        cursor = self.connection.execute(
            "SELECT href, title, description, found_at FROM profiles ORDER BY found_at DESC"
        )
        return [
            {"href": row[0], "title": row[1], "description": row[2], "found_at": row[3]}
            for row in cursor.fetchall()
        ]

    def close(self):
        self.connection.close()


class ProfileSearcher:
    """Search for LinkedIn profiles using DuckDuckGo."""

    def __init__(self):
        self.targets: List[SearchTarget] = []

    def add_target(
        self,
        role: str,
        location: str,
        filter_by_uni: bool = False,
        timeframe: Literal["d", "w", "m", "y"] = "m"
    ):
        """Add a search target."""
        self.targets.append(SearchTarget(
            role=role,
            location=location,
            filter_by_uni=filter_by_uni,
            timeframe=timeframe,
        ))

    def clear_targets(self):
        """Clear all search targets."""
        self.targets = []

    def _build_queries(self, target: SearchTarget) -> List[str]:
        """Build search queries for a target."""
        base = f'site:linkedin.com/in "{target.role}" "{target.location}"'

        if target.filter_by_uni:
            return [f'{base} "{uni}"' for uni in AUSTRALIAN_UNIS]
        return [base]

    def _search_ddgs(
        self,
        query: str,
        timeframe: str,
        max_results: int = 100
    ) -> List[ProfileSearchResult]:
        """Execute DuckDuckGo search."""
        results = []
        try:
            ddgs_results = DDGS().text(
                query=query,
                region='au-en',
                safesearch='off',
                timelimit=timeframe,
                max_results=max_results,
                backend='auto'
            )

            for r in ddgs_results:
                href = r.get('href', '')
                if 'linkedin.com/in/' in href:
                    results.append(ProfileSearchResult(
                        href=href,
                        title=r.get('title'),
                        description=r.get('body'),
                    ))
        except Exception as e:
            logger.error(f"Search error: {e}")

        return results

    def search(self, save_to_db: bool = True) -> List[ProfileSearchResult]:
        """
        Execute all search targets.

        Args:
            save_to_db: Whether to save results to SQLite database

        Returns:
            List of discovered profile results
        """
        all_results: List[ProfileSearchResult] = []

        for target in self.targets:
            queries = self._build_queries(target)

            for query in queries:
                logger.info(f"Searching: {query[:80]}...")
                results = self._search_ddgs(query, target.timeframe)
                logger.info(f"Found {len(results)} results")
                all_results.extend(results)
                time.sleep(2)  # Rate limiting

        # Deduplicate by href
        seen = set()
        unique_results = []
        for r in all_results:
            if r.href not in seen:
                seen.add(r.href)
                unique_results.append(r)

        logger.info(f"Total unique profiles: {len(unique_results)}")

        if save_to_db and unique_results:
            db = ProfileDatabase()
            saved = db.save_results(unique_results)
            logger.info(f"Saved {saved} new profiles to database")
            db.close()

        return unique_results

    def search_single(self, target: SearchTarget) -> List[ProfileSearchResult]:
        """Search for a single target without saving."""
        self.targets = [target]
        return self.search(save_to_db=False)
