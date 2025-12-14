"""
LinkedIn profile discovery via DuckDuckGo search.
"""

import time
import sqlite3
import logging
from typing import List, Optional, Literal
from pathlib import Path

from duckduckgo_search import DDGS

from ..models import SearchTarget, ProfileSearchResult, DevSiteSearchTarget, DevSiteResult

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
        # Don't use site: operator - DDG blocks it. Include linkedin.com/in in query instead.
        base = f'linkedin.com/in {target.role} {target.location}'

        if target.filter_by_uni:
            return [f'{base} {uni}' for uni in AUSTRALIAN_UNIS]
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
            logger.info(f"Executing DDG search: {query}")
            # duckduckgo_search v8+ API - use lite backend without timelimit
            # timelimit forces Bing backend which doesn't return LinkedIn profiles
            ddgs_results = DDGS().text(
                query,
                region='wt-wt',  # worldwide
                safesearch='off',
                timelimit=None,  # timelimit uses Bing which blocks LinkedIn
                backend='lite',  # lite backend works for LinkedIn searches
                max_results=max_results,
            )

            logger.info(f"DDG returned {len(ddgs_results) if ddgs_results else 0} raw results")

            for r in ddgs_results:
                href = r.get('href', '')
                logger.debug(f"Result href: {href}")
                if 'linkedin.com/in/' in href:
                    results.append(ProfileSearchResult(
                        href=href,
                        title=r.get('title'),
                        description=r.get('body'),
                    ))
        except Exception as e:
            logger.error(f"Search error: {e}", exc_info=True)

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


class DevSiteSearcher:
    """Search for developer personal sites, portfolios, and blogs."""

    # Common portfolio/personal site patterns
    PORTFOLIO_INDICATORS = [
        'portfolio', 'projects', 'work', 'about me', 'developer',
        'engineer', 'resume', 'cv', 'personal site', 'personal website'
    ]

    BLOG_INDICATORS = [
        'blog', 'posts', 'articles', 'writing', 'thoughts', 'notes',
        'dev.to', 'medium.com', 'hashnode', 'substack'
    ]

    # Domains to exclude (not personal sites)
    EXCLUDED_DOMAINS = [
        'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
        'instagram.com', 'tiktok.com', 'youtube.com', 'indeed.com',
        'glassdoor.com', 'seek.com', 'monster.com', 'ziprecruiter.com',
        'crunchbase.com', 'bloomberg.com', 'reuters.com', 'wikipedia.org',
        'google.com', 'bing.com', 'yahoo.com', 'amazon.com',
        'baidu.com', 'zhihu.com', 'weibo.com', 'qq.com',  # Chinese sites
        'pinterest.com', 'reddit.com', 'quora.com', 'stackoverflow.com',
        'npmjs.com', 'pypi.org', 'crates.io',  # Package registries
        'babycenter.com', 'babynames.com', 'nameberry.com',  # Baby name sites
        'imdb.com', 'rottentomatoes.com', 'goodreads.com',  # Entertainment
        'coursera.org', 'udemy.com', 'edx.org',  # Learning platforms
        'ebay.com', 'etsy.com', 'aliexpress.com',  # Shopping
        'boards.straightdope.com', 'forums.',  # Forums
        'news.ycombinator.com',  # HN (not personal)
    ]

    def __init__(self):
        self.logger = logging.getLogger("DevSiteSearcher")

    def _classify_site(self, url: str, title: str, description: str) -> Optional[str]:
        """Classify the type of developer site."""
        url_lower = url.lower()
        title_lower = (title or '').lower()
        desc_lower = (description or '').lower()
        combined = f"{url_lower} {title_lower} {desc_lower}"

        # Check exclusions
        for domain in self.EXCLUDED_DOMAINS:
            if domain in url_lower:
                return None

        # GitHub
        if 'github.com' in url_lower or 'github.io' in url_lower:
            return 'github'

        # Blog platforms
        if any(ind in url_lower for ind in ['dev.to', 'medium.com', 'hashnode', 'substack']):
            return 'blog'

        # Check for blog indicators
        if any(ind in combined for ind in self.BLOG_INDICATORS):
            return 'blog'

        # Check for portfolio indicators
        if any(ind in combined for ind in self.PORTFOLIO_INDICATORS):
            return 'portfolio'

        # If it looks like a personal domain (short path, has name)
        if '/' not in url_lower.split('://')[-1].rstrip('/') or url_lower.count('/') <= 3:
            return 'portfolio'

        return 'other'

    def _search_ddgs(self, query: str, max_results: int = 50) -> List[dict]:
        """Execute DuckDuckGo search."""
        try:
            self.logger.info(f"DDG search: {query}")
            results = DDGS().text(
                query,
                region='wt-wt',
                safesearch='off',
                timelimit=None,
                backend='lite',
                max_results=max_results,
            )
            self.logger.info(f"Got {len(results) if results else 0} results")
            return results or []
        except Exception as e:
            self.logger.error(f"Search error: {e}", exc_info=True)
            return []

    def search(self, target: DevSiteSearchTarget) -> List[DevSiteResult]:
        """
        Search for developer personal sites.

        Args:
            target: Search target with name and optional keywords

        Returns:
            List of discovered developer sites
        """
        all_results: List[DevSiteResult] = []
        seen_urls = set()

        queries = []

        # Build queries based on options
        keywords_str = ' '.join(target.keywords) if target.keywords else ''

        if target.include_github:
            # Search for actual GitHub profile, not just github.com
            queries.append(f'"{target.name}" github profile {keywords_str}'.strip())
            queries.append(f'"{target.name}" site:github.io {keywords_str}'.strip())

        if target.include_portfolio:
            queries.append(f'"{target.name}" portfolio site {keywords_str}'.strip())
            queries.append(f'"{target.name}" personal website developer {keywords_str}'.strip())

        if target.include_blog:
            queries.append(f'"{target.name}" blog developer {keywords_str}'.strip())
            queries.append(f'"{target.name}" site:dev.to OR site:medium.com {keywords_str}'.strip())

        for query in queries:
            results = self._search_ddgs(query)

            for r in results:
                url = r.get('href', '')
                if url in seen_urls:
                    continue

                title = r.get('title', '')
                description = r.get('body', '')

                site_type = self._classify_site(url, title, description)
                if site_type:
                    seen_urls.add(url)
                    all_results.append(DevSiteResult(
                        url=url,
                        title=title,
                        description=description,
                        site_type=site_type,
                    ))

            time.sleep(1)  # Rate limiting

        self.logger.info(f"Found {len(all_results)} developer sites for {target.name}")
        return all_results

    def search_by_name(
        self,
        name: str,
        keywords: List[str] = None,
        include_github: bool = True,
        include_portfolio: bool = True,
        include_blog: bool = True,
    ) -> List[DevSiteResult]:
        """Convenience method to search by name."""
        target = DevSiteSearchTarget(
            name=name,
            keywords=keywords or [],
            include_github=include_github,
            include_portfolio=include_portfolio,
            include_blog=include_blog,
        )
        return self.search(target)
