# Security

## Overview

The Survivalist is a client-side web app. Data is stored in the browser (localStorage) or in exported/imported JSON files. There is no server-side user data or authentication.

## Implemented measures

- **No secrets in repo**: No API keys, passwords, or tokens are committed. Use `.env` (gitignored) for any future server-side secrets.
- **Torcha session import**: Only whitelisted localStorage keys are applied; unknown keys from imported JSON are ignored. Max import size 2MB to reduce DoS risk.
- **XSS mitigation**: User- and import-derived data (player names, alliance names, etc.) is escaped when inserted into HTML (e.g. `escapeHtml()` in `dashboard-utils.js`, used in Simoa, Smuffer, Tally, Torcha).
- **.gitignore**: Excludes `.env`, `*.pem`, `secrets/`, and similar so they are never committed.

## Recommendations for deployment

- Serve the app over **HTTPS**.
- Set **Content-Security-Policy** (CSP) headers to restrict script sources and inline scripts if possible.
- Do not expose sensitive files (e.g. `.env`, config with credentials) via the web server.
- If you add a backend or third-party APIs, keep keys in environment variables or a secrets manager, not in the front-end bundle.

## Reporting issues

If you find a security issue, please report it responsibly (e.g. private message to the maintainer rather than a public issue).
