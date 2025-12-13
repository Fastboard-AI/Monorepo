from ddgs import DDGS
import sqlite3
import time

class QueryBuilder:
    def __init__(self):
        self.sydney_locations = [
            "Greater Sydney Area",
            "Sydney, Australia",
            "Sydney, NSW",
            "Sydney, New South Wales"
        ]
        
        self.sydney_universities = [
            "University of New South Wales", "UNSW",
            "University of Sydney", "USyd",
            "University of Technology Sydney", "UTS",
            "Macquarie University", "Western Sydney University"
        ]

    def build_query(self, role, location_name="Sydney", include_universities=True):
        base_query = 'site:linkedin.com/in/'
        
        if location_name.lower() == "sydney":
            loc_logic = ' OR '.join([f'"{loc}"' for loc in self.sydney_locations])
            location_string = f'({loc_logic})'
        else:
            location_string = f'"{location_name}"'

        search_string = f'{base_query} "{role}" {location_string}'
        
        if include_universities:
            uni_logic = ' OR '.join([f'"{uni}"' for uni in self.sydney_universities])
            search_string += f' ({uni_logic})'
            
        return search_string

class LinkedInSearcher:
    def __init__(self):
        self.builder = QueryBuilder()
        self.queries = []
        
    def add_target(self, role, location="Sydney", filter_by_uni=True, timeframe='m'):
        query = self.builder.build_query(role, location, filter_by_uni)
        self.queries.append({'q': query, 'time': timeframe})

    def get_profiles(self):
        combined_results = []
        
        for item in self.queries:
            query = item['q']
            timeframe = item['time']
            
            print(f"\n[Running Search]: {query}")
            
            results = self.search_ddgs(query, timeframe)
            print(f"  - Found {len(results)} results")
            combined_results.extend(results)
            time.sleep(2) 
            
        return combined_results

    def search_ddgs(self, query, timeframe):
        results_list = []
        try:
            results = DDGS().text(
                query=query,
                region='au-en',
                safesearch='off',
                timelimit=timeframe,
                max_results=100,
                backend='auto' 
            )
            
            for r in results:
                results_list.append({
                    'href': r.get('href'),
                    'title': r.get('title'),
                    'description': r.get('body')
                })
        except Exception as e:
            print(f'  ! Search Error: {e}')
        return results_list


class ProfileDatabase:
    def __init__(self):
        self.db_connection = sqlite3.connect('linkedin_profiles.db')
        self.create_table()

    def create_table(self):
        with self.db_connection:
            self.db_connection.execute('''
                CREATE TABLE IF NOT EXISTS profiles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    href TEXT UNIQUE,
                    title TEXT,
                    description TEXT,
                    found_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

    def save_results(self, results):
        count = 0
        for row in results:
            if row.get('href') and "linkedin.com/in/" in row['href']:
                try:
                    with self.db_connection:
                        self.db_connection.execute('''
                            INSERT OR IGNORE INTO profiles (href, title, description)
                            VALUES (?, ?, ?)
                        ''', (row['href'], row['title'], row['description']))
                        count += 1
                except sqlite3.Error:
                    pass 
        print(f"\n[Database]: Saved {count} new unique profiles.")

    def close(self):
        self.db_connection.close()


if __name__ == "__main__":
    searcher = LinkedInSearcher()
    
    searcher.add_target(
        role="Computer Science Student", 
        location="Sydney", 
        filter_by_uni=True, 
        timeframe='m'
    )
    
    searcher.add_target(
        role="Junior Software Engineer", 
        location="Sydney", 
        filter_by_uni=False, 
        timeframe='y'
    )

    print("Starting Search Job...")
    found_profiles = searcher.get_profiles()

    if found_profiles:
        db = ProfileDatabase()
        db.save_results(found_profiles)
        db.close()
    else:
        print("No results found.")