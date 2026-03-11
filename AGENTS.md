# AGENTS.md

## Cursor Cloud specific instructions

This is a static vanilla HTML/CSS/JavaScript website ("The Survivalist") with **no build step, no package manager, and no backend**. All state is stored in browser `localStorage`.

### Running the dev server

Serve the repository root with any static HTTP server. An HTTP server is required (not `file://`) because the Torcha tool uses `fetch()` to load JSON data files.

```
python3 -m http.server 8080
```

The site will be available at `http://localhost:8080/`.

### Project structure

- `index.html` — Homepage with sidebar navigation to all 7 tools
- `edger.html/js` — EDGIC chart editor
- `outlist.html/js` — Season ranking tool
- `simoa.html/js` — Full season simulator
- `smuffer.html/js` — Season progress tracker
- `sutral.html/js` — Winner prediction algorithm
- `tally.html/js` — Fantasy draft game
- `torcha.html/js` — Gacha card game (loads `torcha-cards.json` and `torcha-player-identities.json` via fetch)
- `global.css`, `mobile.css` — Shared styles
- `scripts/` — Offline Node.js utilities for generating/transforming Torcha card data (not runtime)

### Notes

- There are no automated tests, no linter config, and no build system in this project.
- The `scripts/` directory contains data-generation Node.js scripts, not setup scripts.
- External resources loaded via CDN: Google Fonts, html2canvas (in edger.html).
