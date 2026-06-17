import os
import re
import datetime
import requests
import feedparser
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache for parsed release notes
cache = {
    "data": None,
    "last_updated": None
}

def clean_html(raw_html):
    """Clean up extra whitespaces and make HTML tags consistent."""
    if not raw_html:
        return ""
    # Normalize spaces
    clean = re.sub(r'\s+', ' ', raw_html)
    return clean.strip()

def parse_entry_content(entry):
    """
    Splits the entry HTML by <h3> tags and returns a list of update dicts.
    Each update contains: type, content, date, original_link, and id.
    """
    content_html = ""
    if "content" in entry:
        content_html = entry.content[0].value
    elif "summary" in entry:
        content_html = entry.summary

    # Title represents the date in this feed (e.g., "June 16, 2026")
    date_str = entry.get("title", "Unknown Date")
    original_link = entry.get("link", "")
    entry_id = entry.get("id", "")

    # Split content by <h3> case-insensitively
    parts = re.split(r'(?i)<h3>', content_html)
    updates = []

    # If there are no <h3> tags, parse the whole block as 'General'
    if len(parts) <= 1:
        if content_html.strip():
            updates.append({
                "type": "General",
                "content": clean_html(content_html),
                "date": date_str,
                "link": original_link,
                "id": entry_id
            })
        return updates

    # The first part is text before the first <h3> (usually empty)
    # Process remaining parts which contain the type and the content
    for idx, part in enumerate(parts[1:]):
        sub_parts = part.split('</h3>', 1)
        if len(sub_parts) == 2:
            note_type = sub_parts[0].strip()
            note_content = sub_parts[1].strip()
            
            # Remove any internal HTML tags in the header type
            note_type = re.sub('<[^<]+?>', '', note_type).strip()
            
            # Standardize types (Feature, Issue, Deprecation, Announcement, etc.)
            note_type = note_type.capitalize()
            
            # Generate a unique ID for each split update
            update_id = f"{entry_id}#item-{idx}"

            updates.append({
                "type": note_type,
                "content": clean_html(note_content),
                "date": date_str,
                "link": original_link,
                "id": update_id
            })

    return updates

def fetch_and_parse_feed():
    """Fetches the XML feed and parses it into structured release note items."""
    try:
        # Fetch raw XML feed content with a timeout
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        # Parse feed bytes
        feed = feedparser.parse(response.content)
        
        all_updates = []
        for entry in feed.entries:
            all_updates.extend(parse_entry_content(entry))
            
        cache["data"] = all_updates
        cache["last_updated"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        return all_updates, None
    except Exception as e:
        print(f"Error fetching feed: {str(e)}")
        # If fetch fails, return cached data if available, along with the error
        return cache["data"], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if force_refresh or cache["data"] is None:
        updates, error = fetch_and_parse_feed()
    else:
        updates = cache["data"]
        error = None

    if updates is None:
        return jsonify({
            "success": False,
            "error": error or "Failed to load release notes."
        }), 500

    return jsonify({
        "success": True,
        "last_updated": cache["last_updated"],
        "error": error, # Send non-blocking warning if we are serving stale cache
        "data": updates
    })

if __name__ == '__main__':
    # Flask port default is 5000
    app.run(debug=True, host='127.0.0.1', port=5000)
