# Ultime versioni dei file (per data di modifica)

Confronto **origin/main** e **origin/master**: per ogni file è stata considerata la **data dell’ultimo commit** che lo ha modificato su ciascun branch.  
La “versione più recente” è quella con data più recente.

## Risultato

**Per tutti i file tracciati, l’ultima modifica (in ordine di tempo) è sul branch `main`.**

Su **master** le modifiche sono tutte del **2026-03-10 08:27** (commit `5f6fcbd` – S50 expansion, security, .gitignore, SECURITY.md).  
Su **main** ci sono commit più tardi nello stesso giorno (fino a **23:46**), quindi per ogni file la versione “più recente” è quella su **main**.

## Dettaglio per file (ordinato per data ultima modifica, più recente prima)

| Ultima modifica | Branch con ultima versione | File |
|-----------------|----------------------------|------|
| 2026-03-10 23:46 | main | torcha.js, mobile.css |
| 2026-03-10 23:13 | main | torcha.html, global.css |
| 2026-03-10 20:59 | main | torcha-cards.json, scripts/generate-torcha-cards.js, scripts/generate-placeholder-s9-s49.js, scripts/apply-survivoR-stats.js, docs/POWER-SOCIAL-REDESIGN.md |
| 2026-03-10 13:52 | main | tally.js, tally.html, sutral.js, sutral.html, smuffer.js, smuffer.html, outlist.js, outlist.html, edger.js, edger.html |
| 2026-03-10 12:14 | main | tutti gli altri file (torcha-player-identities.json, theme.js, script vari, index, font, README, SECURITY.md, .gitignore, …) |

## Conclusione

- **Locale su `main`** = hai già l’ultima versione di ogni file (quella modificata più recentemente).
- **master** non contiene versioni più nuove: ha solo commit più vecchi (stesso giorno, ora 08:27).
- I file presenti solo su **main** (es. `torcha-player-identities.json`) esistono solo lì.

Se vuoi “l’ultima versione di ogni file in base alla data”, restare su **main** e lavorare con il repo così com’è è corretto.
