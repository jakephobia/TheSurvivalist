# The Survivalist

A collection of tools for Survivor and reality TV fans: EDGIC editor, season rankings, simulator, progress tracker, winner prediction, fantasy draft, and Torcha card game.

**Live:** [thesurvivalist.net](https://www.thesurvivalist.net)

---

## Tools

| Tool | Description |
|------|-------------|
| **Edger** | EDGIC editor: build rating charts (UTR/MOR/CP/OTT, tone, visibility) and export as image |
| **Outlist** | Rank seasons by cast, editing, twists, winner, location; custom weights |
| **Simoa** | Season simulator: tribes, swaps, events, tribal councils, alliances |
| **Smuffer** | Season progress tracker: tribes, advantages, alliances, EDGIC, confessionals, power rankings, votes per episode |
| **Sutral** | Winner prediction algorithm: enter cast and episode data for win probability estimates |
| **Tally** | Fantasy draft: pick castaways, track points from immunity, eliminations, idols |
| **Torcha** | Gacha card game: collect contestant cards, open packs, play with your favorites (beta) |

---

## Tech

- **Static** site: HTML, CSS, vanilla JavaScript
- No build step: the files in the project root are what gets served
- Data: `torcha-cards.json`, `torcha-player-identities.json`; images in `assets/torcha-cards-images/`

---

## Local development

Open `index.html` in your browser or run a local server (e.g. `npx serve .` or your editor’s live preview).

---

## Deploy

Deploy is via FTP (e.g. TopHost).

1. Copy `.env.example` to `.env`
2. Set in `.env`: `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, `FTP_REMOTE` (e.g. `public_html`)
3. Run: `npm run deploy`

---

## Maintenance scripts (Node)

These scripts update Torcha card data and images; they require `npm install`.

| Command | Purpose |
|---------|---------|
| `npm run deploy` | Upload the site via FTP |
| `npm run ensure-weights` | Download face-api.js weights for face cropping (one-time) |
| `npm run crop-wiki-faces` | Crop images in `assets/torcha-wiki-faces/` using face detection |
| `npm run download-card-images` | Download card images and update paths in `torcha-cards.json` |
| `npm run fetch-fandom-45-49` | Fetch and crop Fandom images for seasons 45–49 |
| `npm run apply-brantsteele-44-49` | Apply Brantsteele images for seasons 44–49 |

Heavy dependencies (TensorFlow, canvas, sharp, face-api) are only for these scripts, not for the production site.

---

## Credits

Tools by **u/ylan93** · [Ko-fi](https://ko-fi.com/ylan93) · [YouTube](https://www.youtube.com/@TorchlightTalesYT) · [Instagram](https://www.instagram.com/thesurvivalis7)
