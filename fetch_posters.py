"""
fetch_posters.py
────────────────────────────────────────
Run this ONCE to pre-fetch all movie poster URLs using OMDb (HTTP).
Works perfectly on Python 3.14+ on Windows (no SSL issues).

Creates: data/posters.json
"""

import requests
import csv
import json
import os
import time

# 🔑 PUT YOUR OMDb API KEY HERE
OMDB_API_KEY = "d08efea9"

OMDB_URL = "http://www.omdbapi.com/"

CSV_FILE  = "movies_final.csv"
OUT_FILE  = "data/posters.json"


def fetch_poster(title, year):
    params = {
        "t": title,
        "y": year,
        "apikey": OMDB_API_KEY
    }

    try:
        r = requests.get(OMDB_URL, params=params, timeout=8)
        data = r.json()

        if data.get("Response") == "True":
            poster = data.get("Poster")
            if poster and poster != "N/A":
                return poster

    except Exception as e:
        print(f" ⚠ Error fetching '{title}': {e}")

    return None


def main():
    if OMDB_API_KEY == "PASTE_YOUR_OMDB_KEY_HERE":
        print("❌ Please set your OMDb API key at the top of this file.")
        return

    if not os.path.exists(CSV_FILE):
        print(f"❌ {CSV_FILE} not found.")
        return

    os.makedirs("data", exist_ok=True)

    # Load existing posters if resuming
    posters = {}
    if os.path.exists(OUT_FILE):
        with open(OUT_FILE, encoding="utf-8") as f:
            posters = json.load(f)
        print(f"✅ Loaded {len(posters)} cached posters")

    movies = []
    with open(CSV_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            movies.append({
                "title": row["title"].strip(),
                "year":  row["year"].strip()
            })

    total = len(movies)
    pending = [m for m in movies if m["title"] not in posters]

    print(f"\n🎬 {total} movies total")
    print(f"🔍 {len(pending)} posters to fetch\n")

    for i, m in enumerate(pending, 1):
        title = m["title"]
        year  = m["year"]

        print(f"[{i}/{len(pending)}] {title} ({year})", end=" ... ", flush=True)

        poster = fetch_poster(title, year)
        posters[title] = poster

        if poster:
            print("✅")
        else:
            print("❌ no poster")

        # Save progress every 10 movies
        if i % 10 == 0:
            with open(OUT_FILE, "w", encoding="utf-8") as f:
                json.dump(posters, f, indent=2)
            print("💾 progress saved")

        time.sleep(0.25)  # be polite to API

    # Final save
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(posters, f, indent=2)

    found = sum(1 for p in posters.values() if p)
    missing = total - found

    print("\n✅ DONE")
    print(f"🖼 Posters found: {found}")
    print(f"❌ Missing: {missing}")
    print(f"📁 Saved to: {OUT_FILE}")


if __name__ == "__main__":
    main()