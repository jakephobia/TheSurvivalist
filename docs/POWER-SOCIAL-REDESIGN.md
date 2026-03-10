# Piano: Strength e Strategy rivoluzionati

## Convenzioni attuali (implementate)
- **Strength** e **Strategy** (memorizzati come power/social nel JSON) sono **calcolati in modo indipendente** (nessun legame tipo strategy = 2×strength).
- Entrambi hanno **range 1–200** (min 1, max 200).
- Ogni concorrente ha power e social derivati da placement + jitter deterministico (seed da nome+stagione), così stesso placement ≠ stesse stat.

## Problema iniziale (risolto)
- In passato: social = 2×power e stesso placement → stat identiche. Ora power e social sono indipendenti e con massimo 200.

## Obiettivi
1. **Differenziare i concorrenti**: stesso placement ≠ stesse stat.
2. **Archetypes**: alcuni “challenge beast” (alto power, social più basso), altri “social butterfly” (alto social, power più basso), altri bilanciati.
3. **Riproducibilità**: niente random “vero”; stesso nome + stagione → stesso profilo (seed deterministico).
4. **Bilanciamento**: il valore efficace in combattimento (es. `power + 0.5*social` in `roundDamage`) resta in un range simile per placement, così il gioco non si rompe.

---

## Design

### 1. Budget per placement (range 1–200)
- Il **placement** definisce una **base** comune (1–200) per entrambe le stat.
- **Strength** e **social** sono calcolati **separatamente**: ciascuno = base + jitter proprio (hash diverso), poi clamp in [1, 200]. Nessun legame tra i due valori.

### 2. Seed deterministico per concorrente
- `seed = hash(name + "|" + season)` (hash numerico semplice, senza dipendenze esterne).
- Stesso concorrente → stesso seed → stesso profilo ogni volta che si rigenera.

### 3. Archetype da seed
- Dal seed si deriva un **archetype**:
  - **Physical** (~33%): power alto, social più basso (challenge beast).
  - **Strategy** (~33%): social alto, power più basso (stratega / social butterfly).
  - **Balanced** (~34%): power e social più vicini.
- La scelta è deterministica (es. `seed % 3` o percentili da hash).

### 4. Split power/social
- Dal **budget** (legato al placement) e dall’**archetype** si decide come spezzare tra power e social.
- Esempio (concettuale):
  - Physical: 60% budget → power, 40% → social (poi scalare social per avere numeri in range desiderato).
  - Social: 40% power, 60% social.
  - Balanced: 50% / 50%.
- Si applicano **min/max** per evitare stat fuori range: **power e social entrambi in [1, 200]**.

### 5. Variabilità fine (stesso archetype)
- Usare una seconda derivata dal seed (es. altro byte dell’hash) per aggiungere **variazione fine** (es. ±5–10%) sul rapporto power/social dentro lo stesso archetype.
- Così due “Physical” non sono identici.

### 6. Vincoli di bilanciamento
- Per ogni placement, la **distribuzione** di “effective power” (`power + 0.5 * social`) resta con **media simile** a prima, ma con **varianza** maggiore.
- Opzionale: cap per placement (es. nessun 16° posto con effective power superiore al 90° percentile del 5° posto).

---

## Formule (da implementare)

1. **Base da placement** (range 1–200, power e social indipendenti):
   - `pct = 1 - (placement - 1) / total`
   - `base = 1 + pct * 199` → range 1–200.
   - `power = clamp(1, 200, round(base + powerJitter))`, `social = clamp(1, 200, round(base + socialJitter))` con jitter diversi (hash(seed) vs hash(seed+"|s")).

2. **Hash seed** (semplice, no crypto):
   - `hash(s)`: somma di charCode con shift, o moltiplicazione per primo (es. 31), modulo 2^32.

3. **Archetype**:
   - `archetype = [ 'physical', 'social', 'balanced' ][ seed % 3 ]` (o con distribuzione pesata).

4. **Split** (esempio):
   - Physical: target_effective → risolvi `power + 0.5*social = target`, con `power/social = 1.2` (power più alto).
   - Social: idem con `power/social = 0.6`.
   - Balanced: `power/social = 1` (power = social nel “effective”? no: power = social in valore assoluto, poi scalare per rispettare target effective).
   - Meglio: definire **range** per power e social (min, max), e **rapporto** power/social da archetype + jitter da seed. Poi normalizzare così che `power + 0.5*social ≈ target_effective`.

5. **Jitter**:
   - Secondo numero da seed (es. `(seed >>> 8) % 21 - 10` → ±10) per aggiungere punti a power o toglierli a social (o viceversa) mantenendo approssimativamente il target.

---

## File da toccare
- **`scripts/generate-torcha-cards.js`**: sostituire `placementToPowerSocial(placement, total)` con la nuova logica (seed da name+season, archetype, split, jitter, clamp).
- **`torcha.js`**: nessun cambio necessario; continua a usare `card.power` e `card.social` in `roundDamage` e UI.
- **Carte esistenti (torcha-cards.json / s9-s49)**: vanno **rigenerate** con il nuovo script per avere la nuova varietà (le carte S1–S8 andrebbero allineate con uno script simile se esiste un generatore per quelle).

---

## Riepilogo benefici
- Ogni concorrente ha un **profilo unico** (power vs social) pur con stesso placement.
- **Archetypes** leggibili (in futuro si può esporre “physical/social/balanced” in UI).
- **Deterministico** → stesse carte ad ogni generazione.
- **Bilancio** preservato in media per placement, con più varietà e replay value.

---

# Come funziona (in breve) e dove scegliere

## Due strade possibili

- **Fase 1 (solo placement + seed):** Strength e Strategy derivano dal **placement** (come oggi) ma lo **splitti** in modo diverso per ogni concorrente usando un seed deterministico (nome + stagione) → archetype (physical/social/balanced) + jitter. **Nessun dato esterno**, solo logica nel generatore.
- **Fase 2 (dati Survivor Stats DB):** Strength e Strategy derivano dalle **statistiche reali** (outplay, outwit, vote, jury, challenge) del pacchetto survivoR. Servono i **dati** (JSON/xlsx) e un **match** nome+stagione ↔ castaway_id.

Se usi la **Fase 2**, sotto trovi le **scelte** da fare; se resti sulla Fase 1, le opzioni rilevanti sono quelle nel primo blocco (budget, archetype, jitter, bilanciamento).

---

## Scelte da fare (Fase 2 – dati survivoR)

### 1. Normalizzazione Strength (come passare dagli score al numero 25–110)

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **A – Solo percentile in stagione** | In ogni stagione, il migliore in `score_outplay` prende power 110, il peggiore 25, gli altri in proporzione. | Un vero “challenge beast” che esce 8º può avere power alto. Molto fedele ai dati. | Un primo boot con una challenge vinta potrebbe avere power più alto di un 5º posto debole in challenge. |
| **B – Blend con placement** | `power = α * power_da_stat + (1−α) * power_da_placement`. Es. α = 0.7: 70% statistiche, 30% placement. | Chi arriva più in là ha un minimo garantito; meno “strani” (es. 16º con power 100). | Un po’ meno “puro” rispetto ai dati; il placement continua a contare. |

**Scegli:** A se vuoi massima fedeltà alle performance; B se vuoi che il placement continui a “tirare” le stat.

---

### 2. Ruolo del placement (quanto conta il piazzamento)

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **Solo statistiche** | Strength e Strategy al 100% da score (con fallback placement solo per early boot senza dati). | Massima differenza tra “come hai giocato” e “dove sei arrivato”. | Rischio di carte “strane” (es. primo boot con power alto). |
| **Blend** | Come in 1B: power e social sono una miscela di stat + valore da placement. | Bilancio più prevedibile; le rarità (legend/super_rare/rare) restano legate al placement. | Meno estremi, un po’ meno “canone” Survivor. |
| **Cap per placement** | Le stat decidono power/social, ma imponi un tetto per placement (es. un 16º non può superare un certo effective power). | Rarità e “forza” restano allineate al placement. | Più complesso da calibrare; alcuni profili veri (es. challenge beast bootato presto) vengono “tagliati”. |

**Scegli:** Solo stat se ti va bene avere carte molto varie; Blend per un compromesso; Cap se vuoi che un 16º non sia mai “troppo” forte in PvP.

---

### 3. Bilanciamento PvP (power + 0.5×social)

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **1 – Riscalare per placement** | Dopo aver calcolato power e social, normalizzi in modo che **per ogni placement** la media di (power + 0.5×social) resti simile a oggi. | Il PvP resta bilanciato come ora; le rarità “valgono” come prima. | Alcune carte potrebbero sembrare “appiattite”. |
| **2 – Lasciare variare** | Nessuna normalizzazione: accetti che ci siano carte molto “estreme” (alto power / basso social o viceversa) e un meta diverso. | Massima varietà e fedeltà ai dati. | Il bilanciamento PvP cambia; alcune rarità potrebbero essere più/meno forti in media. |

**Scegli:** 1 per non toccare il feeling del PvP; 2 se vuoi che il gioco rifletta di più i profili reali anche a costo di riequilibrare dopo.

---

### 4. Formula Strategy (quali score usare e con che pesi)

Strategy = combinazione di `score_outwit`, `score_vote`, `score_jury`, `score_inf`.

| Opzione | Pesi (outwit, vote, jury, inf) | Quando ha senso |
|--------|-------------------------------|----------------|
| **Outwit dominante** | es. 0.6, 0.2, 0.1, 0.1 | Vuoi che “social” = soprattutto strategia/outwit; jury e voto contano meno. |
| **Bilanciata** | es. 0.5, 0.25, 0.15, 0.1 | Come nel doc: outwit e vote pesano, jury per finalisti, influenza in supporto. |
| **Jury forte** | es. 0.4, 0.2, 0.3, 0.1 | Vuoi che i finalisti che ricevono molti voti jury abbiano social molto alto. |

**Scegli:** Bilanciata è un buon default; Jury forte se vuoi che vincitori/runner-up “social” risaltino; Outwit dominante se vuoi dare più peso al gioco strategico che al risultato finale.

---

### 5. Strength: solo score_outplay o anche dettaglio challenge?

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **Solo score_outplay** | Un solo numero per stagione da survivoR. | Semplice, pochi dati, niente join aggiuntivi. | Meno granulare. |
| **+ r_score_chal_*** | Aggiungi (es. in media) `r_score_chal_individual_immunity`, `r_score_chal_individual_reward` per dare più peso alle challenge individuali. | Strength più “challenge beast” (individuali contano di più). | Più campi da leggere e normalizzare. |
| **+ challenge_summary** | Usi i conteggi “vittorie individual immunity” (e simili) da `challenge_summary` per normalizzare o sostituire. | Massimo controllo (es. “win rate” individual immunity). | Pipeline più complessa (join, conteggi per stagione). |

**Scegli:** Solo score_outplay per partire subito; + r_score_chal o challenge_summary se vuoi un Strength più “atletico” o basato sulle individuali.

---

### 6. Range per Strength e Strategy

**Implementato:** power e social sono **indipendenti** e entrambi in **[1, 200]** (min 1, max 200). Stessa scala per entrambi; nessun rapporto fisso. Nel motore `roundDamage = power + 0.5*social` usa direttamente questi valori.

---

## Riepilogo: cosa scegliere per andare avanti

Puoi rispondere con qualcosa tipo:

- **Fase:** 1 (solo seed) **oppure** 2 (dati survivoR).
- Se Fase 2: **1** A o B (normalizzazione Power), **2** Solo stat / Blend / Cap, **3** Riscalare (1) o Variare (2), **4** Formula social (Outwit dominante / Bilanciata / Jury forte), **5** Power (solo outplay / + r_score_chal / + challenge_summary), **6** Range social (25–110 o 50–220).

Da lì si può mettere nero su bianco la formula esatta e poi implementare.

---

# Fase 2: Strength e Strategy da statistiche in-game (Survivor Stats DB / survivoR)

L’idea è usare **dati reali** di gioco invece di (o insieme a) placement e seed. La fonte è [Survivor Stats DB](https://survivorstatsdb.com), costruito sul pacchetto [survivoR](https://github.com/doehm/survivoR): dati strutturati per stagione, concorrente, challenge, voti, jury. I dati sono disponibili in [JSON](https://github.com/doehm/survivoR/tree/master/dev/json) o in [xlsx](https://github.com/doehm/survivoR/raw/refs/heads/master/dev/xlsx/survivoR.xlsx) per chi non usa R.

## Fonti dati rilevanti

### 1. `castaway_scores` (survivoR)
Tabella per **castaway × season** con score già calcolati dal pacchetto:

| Campo | Significato | Uso suggerito |
|-------|-------------|----------------|
| `score_outplay` | Successo nelle challenge (Outplay) | **Strength** |
| `score_outwit` | Strategia / voto / influenza (Outwit) | **Strategy** |
| `score_outlast` | Resistenza / durata nel gioco | Strength o mix |
| `score_vote` | Efficacia del voto (maggioranza, target eliminato) | **Strategy** |
| `score_jury` | Voti di jury ricevuti (solo finalisti) | **Strategy** |
| `score_inf` | Influenza (metriche derivate) | **Strategy** |
| `score_adv` | Uso vantaggi (idoli, ecc.) | Opzionale (social/outwit) |
| `r_score_chal_*` | Score challenge per tipo (immunity, reward, individual, tribal) | **Strength** (dettaglio) |

Qui **Strength** si mappa naturalmente a *Outplay* (challenge), **Strategy** a *Outwit* (voto, strategia, jury, influenza).

### 2. `challenge_results` / `challenge_summary`
- **challenge_results**: per ogni challenge, chi ha vinto; campi `won`, `won_individual_immunity`, `won_individual_reward`, `won_tribal_immunity`, `won_tribal_reward`, `won_duel`, ecc.
- **challenge_summary**: conteggi per categoria (Individual Immunity, Tribal Reward, ecc.) e per castaway.

**Uso per Power:**
- Tasso vittorie individual immunity (e magari reward) → “challenge beast”.
- Numero assoluto di win (o win/tentativi) normalizzato per stagione (es. percentile nella stagione) per non penalizzare chi esce presto.

### 3. `vote_history`
- Chi ha votato chi, in quale tribal, se aveva immunity, se il voto è stato nullified (idol), split vote, ecc.

**Uso per Social:**
- % di voti “efficaci” (voto in maggioranza / voto che ha mandato a casa il target).
- Quante volte il concorrente era “on the right side of the vote”.
- Opzionale: metriche di “pulizia” del voto (nessun nullified, nessun tie).

### 4. `jury_votes`
- Per le finali: chi ha ricevuto quanti voti da jury.

**Uso per Social:**
- Per i **finalisti**: numero (o percentuale) di voti jury ricevuti → riflette il rispetto sociale/strategico.
- Per **non finalisti**: non si applica direttamente; si può usare solo outwit/vote/inf.

### 5. `challenge_description`
- Tipo di challenge: `strength`, `endurance`, `balance`, `puzzle`, `memory`, `water`, `race`, ecc.

**Uso opzionale per Power:**
- Pesare le vittorie: più peso a individual immunity / reward, o a challenge “fisiche” (strength, endurance) per un “Strength” più atletico, e meno peso a puzzle/memory se si vuole distinguere power “fisico” da “mentale” (in quel caso si potrebbero usare due sotto-componenti).

---

## Come ricalcolare Strength e Strategy

### Power (Outplay + challenge)
- **Base:** `score_outplay` (già aggregato da survivoR) per quella stagione.
- **Dettaglio (opzionale):** combinare `r_score_chal_individual_immunity`, `r_score_chal_individual_reward`, o conteggi da `challenge_summary` (es. win individual immunity / numero di individual immunity nella stagione).
- **Normalizzazione:** gli score sono per stagione; vanno messi in scala **[1, 200]** (power e social indipendenti, max 200):
  - **Opzione A:** percentile del concorrente **nella stagione** (es. 0–1) → riscala lineare a [1, 200].
  - **Opzione B:** combinare con placement: `power_raw = f(score_outplay)`, poi `power = blend(placement_base, power_raw)` in [1, 200].
  - **Early boot:** fallback (es. solo placement, o power = minimo 1).

### Social (Outwit + voto + jury + influenza)
- **Base:** `score_outwit` (strategia/social già aggregato).
- **Integrare:** `score_vote`, `score_jury` (per finalisti), `score_inf`.
- Formula proposta (concettuale):  
  `social_raw = w1 * score_outwit + w2 * score_vote + w3 * score_jury + w4 * score_inf`  
  con pesi w1..w4 (es. 0.5, 0.25, 0.15, 0.1) e score normalizzati (es. 0–1 per stagione o globali).
- **Normalizzazione:** come per Power, percentile o blend con placement, poi riscala a **[1, 200]** (stesso range di power; nessun rapporto fisso).
  - **Non finalisti:** `score_jury` = 0 o NA; usare solo outwit/vote/inf.

### Placement come contesto (non più unica fonte)
- Il **placement** non è più l’unica variabile: riflette *quanto in là* sei arrivato, non *come* ci sei arrivato.
- Si può:
  - **Solo statistiche:** power e social al 100% da score/challenge/vote (con fallback per early boot).
  - **Blend:** `power_final = α * power_from_stats + (1−α) * power_from_placement` (idem social), così il placement “tira” verso la media per quel piazzamento e si evita che un primo boot abbia power 110 solo perché ha vinto 1 challenge.
  - **Cap per placement:** es. un 16º posto non può superare un certo power/social massimo, per non stravolgere il bilanciamento per rarità.

### Bilanciamento del gioco
- Il motore usa `roundDamage(card) = power + 0.5*social + random`. Se passi a stat 100% da dati reali, la **distribuzione** di (power + 0.5*social) cambierà: alcuni “challenge beast” avranno power altissimo e social basso, altri il contrario.
- Per non rompere PvP:
  - **Opzione 1:** riscalare in modo che la **media** di (power + 0.5*social) per placement resti simile a oggi (aggiungi un passaggio di normalizzazione globale per placement).
  - **Opzione 2:** lasciare che i mazzi siano più vari (alcune carte “estreme”) e accettare un meta diverso.

---

## Proposta: calcolo Strength e Strategy da survivoR (indipendenti)

Di seguito una proposta operativa: **Strength** e **Strategy** sono calcolati con **input e formule completamente separati**. Nessun valore usato per l’uno entra nel calcolo dell’altro. Entrambi in uscita in **[1, 200]**.

### Fonte dati principale: `castaway_scores`

Una riga per (castaway, season) con, tra gli altri:

- `score_outplay` — performance challenge (Outplay)
- `score_outwit` — strategia / outwit
- `score_vote` — efficacia del voto
- `score_jury` — voti jury ricevuti (solo finalisti; altri = 0 o NA)
- `score_inf` — influenza
- opzionale: `r_score_chal_individual_immunity`, `r_score_chal_individual_reward` per dettaglio challenge

Da `castaways` (o `castaway_details`) si usa `castaway_id`, `full_name`, `season`, `result`/`order` per placement e per il match con le nostre carte (nome + stagione).

---

### Calcolo Power (solo dati “fisici” / challenge)

**Input usati (solo questi):** placement, score_outplay; opzionale r_score_chal_*.

1. **Raw power**  
   - Se disponibile `score_outplay` per quel (castaway, season):  
     `power_raw = score_outplay`  
   - Opzionale:  
     `power_raw = 0.6 * score_outplay + 0.2 * r_score_chal_individual_immunity + 0.2 * r_score_chal_individual_reward`  
     (o analoghi), così il power riflette soprattutto le challenge individuali.
2. **Normalizzazione per stagione**  
   - Per la stagione, calcola min e max di `power_raw` tra tutti i concorrenti.  
   - Percentile (o min-max normalizzato):  
     `u_power = (power_raw - min_s) / (max_s - min_s + ε)` in [0, 1]  
     (ε piccolo per evitare divisione per zero se tutti uguali).
3. **Scala 1–200**  
   `power = round(1 + u_power * 199)` poi `clamp(1, 200)`.
4. **Fallback (dati mancanti o early boot con pochi dati)**  
   - Se non c’è `castaway_scores` per quel concorrente/stagione, o si vuole un minimo garantito:  
     usa solo placement: `pct = 1 - (placement - 1) / total`, `power = round(1 + pct * 199)`, clamp [1, 200].  
   - Nessun uso di score_outwit, score_vote, score_jury, score_inf nel power.

**Power non dipende da nessun dato “social”.**

---

### Calcolo Social (solo dati “strategia” / voto / jury / influenza)

**Input usati (solo questi):** placement, score_outwit, score_vote, score_jury, score_inf. Nessun score_outplay né r_score_chal_*.

1. **Raw social**  
   - Per **finalisti** (hanno score_jury):  
     `social_raw = w1 * score_outwit + w2 * score_vote + w3 * score_jury + w4 * score_inf`  
     con ad es. `w1=0.5, w2=0.25, w3=0.15, w4=0.1`.  
   - Per **non finalisti**: `score_jury = 0` (o NA da escludere):  
     `social_raw = w1' * score_outwit + w2' * score_vote + w4' * score_inf`  
     con ad es. `w1'=0.55, w2'=0.3, w4'=0.15` (stessa somma 1 se preferisci normalizzare).
   - Usa score già in [0,1] o normalizzati per stagione prima di pesare, così social_raw resta in uno scale coerente.
2. **Normalizzazione per stagione**  
   - Stesso schema del power: min/max (o percentile) di `social_raw` nella stagione →  
     `u_social = (social_raw - min_s) / (max_s - min_s + ε)` in [0, 1].
3. **Scala 1–200**  
   `social = round(1 + u_social * 199)` poi `clamp(1, 200)`.
4. **Fallback (dati mancanti)**  
   - Se mancano tutti gli score social: usa solo placement come per il power,  
     `social = round(1 + pct * 199)`, clamp [1, 200].  
   - Nessun uso di score_outplay né challenge nel social.

**Social non dipende da nessun dato “challenge”.**

---

### Riepilogo indipendenza

| Stat   | Input usati                                      | Non usa mai                          |
|--------|--------------------------------------------------|--------------------------------------|
| Power  | placement, score_outplay, (opz.) r_score_chal_*  | outwit, vote, jury, inf              |
| Social | placement, score_outwit, score_vote, score_jury, score_inf | outplay, r_score_chal_*               |

Stesso placement può dare power alto e social basso (challenge beast) o il contrario (stratega); le due stat sono **calcolate in modo del tutto indipendente** e solo poi affiancate sulla carta (entrambe 1–200).

---

### Opzioni rapide

- **Solo castaway_scores:** basta la tabella `castaway_scores` (e `castaways` per nome/placement); nessun join con vote_history o challenge_results.
- **Power più “individuale”:** includere `r_score_chal_individual_immunity` e/o `r_score_chal_individual_reward` nella formula di power_raw.
- **Blend con placement:** invece di usare solo percentile stagione, `power_final = α * power_da_stat + (1−α) * power_da_placement` (idem per social), con α es. 0.7, mantenendo sempre output in [1, 200].

---

## Pipeline dati (da fare, non implementato)

1. **Acquisizione:** scaricare o clonare i dati survivoR (JSON o xlsx), o usare API/export da Survivor Stats DB se disponibili.
2. **Join:** per ogni (castaway, season) avere una riga con: placement, score_outplay, score_outwit, score_vote, score_jury, score_inf, (opzionale) challenge win counts.
3. **Match con le nostre carte:** identificare il concorrente con `castaway_id` o (full_name, season); le nostre carte usano `name` + `season` → serve un mapping name ↔ castaway_id (survivoR ha `castaways` con full_name, castaway_id, season).
4. **Calcolo Power:** da score_outplay (+ eventuali r_score_chal_*) → normalizzazione per stagione → riscala a **[1, 200]**; fallback placement per early boot / dati mancanti.
5. **Calcolo Social:** da score_outwit, score_vote, score_jury, score_inf → combinazione pesata → normalizzazione → riscala a **[1, 200]** (indipendente da power); fallback per non finalisti (no jury).
6. **Output:** stesso formato carte (id, name, season, placement, power, social, rarity, …); eventuale campo extra `archetype` (derivato da power vs social, es. power > social → "physical") per UI futura.

---

## Riepilogo benefici (Fase 2)
- **Strength (power)** e **Strategy (social)** riflettono come il concorrente ha davvero giocato (challenge vs strategia/voto/jury).
- Differenza forte tra “challenge beast” (alto outplay, magari outwit più basso) e “stratega” (alto outwit, outplay più basso).
- Dati **oggettivi** e **riproducibili** (stesso dataset → stesse carte).
- Possibilità di allineare le carte al “canone” Survivor (es. Joe Anglim power altissimo, Sophie Clarke social alto).
- Carte S1–S8 e altre stagioni in survivoR possono usare la stessa pipeline una volta risolto il matching nome/castaway_id.
