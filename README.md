*How it was built?*

Curated and enriched a personal movie dataset (CSV)
Added multi-tag mood classification using genre, ratings, and review sentiment
Implemented a force simulation and custom tooltip system in D3
Designed all UI and interactions using vanilla HTML, CSS, and JavaScript
Deployed as a static site on Netlify

*Tech stack*

D3.js
Vanilla JavaScript
HTML & CSS
Netlify

*Data Arrangements and API*

The foundation of the dataset comes from Letterboxd.
I exported my personal viewing history directly from Letterboxd, which provides a CSV containing:

Film title
Year of release
My rating
Date watched

This export acts as the source of truth for what I’ve watched and rated. Metadata enrichment via OMDb
The raw Letterboxd export is intentionally minimal, so it was enriched using the OMDb API.

Using a Python script:

Each film title + year was queried against OMDb
Additional metadata was fetched:
IMDb rating
Genre(s)
Language
Plot summary

This step transforms the dataset from a personal log into something suitable for analysis and visualization.

Poster enrichment

For visual polish, posters were fetched separately using the TMDb API and cached locally as a JSON file.
This is done once and reused, keeping the site static and API-free at runtime.
