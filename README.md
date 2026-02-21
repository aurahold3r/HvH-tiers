# Tier Testing Leaderboard

Simple static leaderboard that reads `data/results.json` and displays stats and player tiers.

Run locally (serve the folder) and open `http://localhost:8000`:

```bash
cd /workspaces/HvH-tiers
python3 -m http.server 8000
```

Files created:
- [index.html](index.html)
- [src/style.css](src/style.css)
- [src/app.js](src/app.js)
- [data/results.json](data/results.json)

Edit `data/results.json` to update data; the site will read the file on load.
# HvH-tiers