# Torcha: sistema combinato Matchmaking (3) + CPU che risponde (7)

Overview di come può funzionare il sistema **matchmaking per forza** + **CPU che risponde al tipo di mazzo**, con casi limite e scelte da definire.

---

## 1. Flusso generale

1. Il giocatore sceglie 5 carte e clicca Fight.
2. **Analisi mazzo giocatore**: si calcolano:
   - **Forza** (un numero per il matchmaking)
   - **Profilo** (tipo di mazzo: “tank”, “glass cannon”, “bilanciato”)
3. **Pool CPU**: partiamo dal pool “released” (o full cards se released < 5).
4. **Filtro per forza**: teniamo solo carte con forza **simile** a quella del mazzo giocatore (banda o quantile).
5. **Risposta al profilo**: all’interno di questo sotto-pool, **ordiniamo/prendiamo** le 5 carte che “rispondono” al profilo (es. contro un tank privilegiamo Power, contro un glass cannon privilegiamo Social).
6. Si estraggono 5 carte da questo insieme (random tra le candidate migliori, o top 5 fissi) e si combatte.

---

## 2. Come definire la “forza” (matchmaking)

Serve **un solo numero** per carta e per mazzo, per poter confrontare e filtrare.

- **Proposta semplice**: `forza = Power + Social` (per carta). Per il mazzo: somma delle 5 carte.
- **Proposta pesata**: `forza = Power * 1.2 + Social` (o viceversa) se vuoi dare più peso al danno o alla sopravvivenza nel matchmaking.
- **Alternativa**: stessa formula usata in battaglia in modo implicito (HP = somma Social, danno = Power), quindi “forza” potrebbe essere una stima di chi vince in media, es. `k * totalSocial + totalPower` con un k scelto da te.

**Domanda per te:** Preferisci forza = **Power + Social** (semplice e comprensibile) o una formula pesata (e se sì, cosa conta di più per “livello” del mazzo)?

---

## 3. Cosa significa “forza simile” (banda / quantile)

**Opzione A – Banda percentuale**  
- Calcoli `forzaUser = somma(forza delle 5 carte)`.
- Per ogni carta nel pool CPU calcoli la sua forza; tieni le carte con `forza ∈ [forzaUser * (1 - δ), forzaUser * (1 + δ)]`, es. δ = 0.15 → ±15%.
- Pro: facile da spiegare (“avversari circa come te”).  
- Contro: se il giocatore ha un mazzo estremo (altissimo o bassissimo), la banda potrebbe dare pochi o troppi candidati.

**Opzione B – Quantile**  
- Ordini tutte le carte del pool per forza; calcoli la forza del mazzo giocatore e vedi in che **quantile** cade (es. “è nel top 20%”).
- Il sotto-pool CPU = carte nello **stesso quantile** (es. top 20%) o in un quantile “vicino” (es. 15–25%).
- Pro: si adatta bene a qualsiasi distribuzione di forza (mazzi deboli vs mazzi fortissimi).  
- Contro: un po’ più complesso da implementare e da comunicare in UI (“avversari dello stesso livello”).

**Opzione C – Banda assoluta**  
- `forzaUser ± N` (es. ±80 punti).  
- Pro: molto semplice.  
- Contro: con N fissi, mazzi molto deboli o molto forti possono avere pool troppo grandi o vuoti.

**Raccomandazione:** B (quantile) per robustezza, oppure A (banda percentuale) se vuoi qualcosa di più intuitivo. In entrambi i casi servono **fallback** (vedi sotto).

**Domanda per te:** Preferisci “avversari in una **banda percentuale** di forza” (es. ±15%) o “avversari nello **stesso livello** (quantile)”?

---

## 4. Come definire il “profilo” del mazzo (per la risposta)

L’idea è capire **come** colpisce il mazzo (molto danno vs molta vita) e far rispondere la CPU di conseguenza.

- **User total Power** = somma dei Power delle 5 carte (danno potenziale).
- **User total Social** = somma dei Social delle 5 carte = HP del giocatore.

Possibili profili (esempi):

| Profilo       | Significato                          | Risposta CPU (cosa privilegiare)     |
|---------------|--------------------------------------|---------------------------------------|
| **Tank**      | Molto Social, Power relativamente basso | CPU privilegia **Power** (per abbattere l’HP) |
| **Glass cannon** | Molto Power, Social basso           | CPU privilegia **Social** (per resistere ai colpi) |
| **Bilanciato**| Power e Social simili (o medi         | CPU può privilegiare un mix o “bilanciato” |

Come decidere il profilo in modo numerico:

- **Rapporto**: `ratio = totalPower / totalSocial` (o l’inverso).
  - ratio alto → glass cannon → CPU preferisce Social.
  - ratio basso → tank → CPU preferisce Power.
- **Soglie**: definisci intervalli, es. se `totalSocial > totalPower * 1.2` → tank; se `totalPower > totalSocial * 1.2` → glass cannon; altrimenti bilanciato.
- **Score di “counter” per ogni carta CPU**:  
  `counterScore = α * card.Power + β * card.Social`  
  dove α e β dipendono dal profilo utente (es. se tank: α alto β basso; se glass cannon: α basso β alto).

**Domanda per te:** Ti basta una distinzione a **3 livelli** (tank / glass cannon / bilanciato) o vuoi una formula continua (sempre un peso α/β in base a ratio Power/Social)?

---

## 5. Come usare il profilo per scegliere le 5 carte CPU

Dopo aver filtrato il pool per **forza simile**:

1. Assegni a ogni carta nel sotto-pool un **counter score** (es. `α*Power + β*Social` con α,β dal profilo).
2. Ordini le carte per counter score (decrescente).
3. **Scelta finale**:
   - **Deterministico**: prendi le top 5 → CPU sempre “ottimale” contro quel mazzo (può essere troppo difficile).
   - **Random tra le migliori**: prendi le top 20 (o top 50%) e da lì estrai 5 random → CPU forte ma con variazione.
   - **Pesato**: estrai 5 con probabilità proporzionale al counter score → più spesso carte “contro”, ma non sempre le stesse.

**Domanda per te:** Preferisci CPU **sempre** con le 5 carte “migliori” contro di te (più difficile), o **spesso** buone ma con un po’ di RNG (top N + random)?

---

## 6. Casi limite e fallback

| Caso | Problema | Soluzione proposta |
|------|----------|--------------------|
| **Pool “forza simile” ha < 5 carte** | Non possiamo formare un mazzo CPU da 5. | **Fallback 1**: allarga la banda (o il quantile) e riprova. **Fallback 2**: se ancora non basta, usa l’intero pool e applica solo la “risposta” (ordina per counter score e prendi 5). |
| **Mazzo giocatore fortissimo (forza altissima)** | Quasi nessuna carta nel pool ha forza così alta. | Stesso allargamento; in ultima istanza prendi le **top 5 per forza** nel pool e poi eventualmente riordini per counter (così la CPU è “il meglio disponibile” e adattato al profilo). |
| **Mazzo giocatore debolissimo** | Tutte le carte sono “simili” (banda enorme). | Va bene: il sotto-pool è grande, la “risposta” restringe a carte che controbattono; se il sotto-pool è tutto il pool, la logica è solo “risposta”. |
| **Profilo bilanciato (Power ≈ Social)** | α e β simili → counter score ≈ “forza”; la CPU sceglie semplicemente le carte più forti nella banda. | Comportamento corretto: nessuna contro-strategia particolare, matchmaking per forza domina. |
| **Pool “released” molto piccolo** | Poche carte totali, banda/quantile potrebbe essere stretto. | Se `released.length < 5` già oggi usi `cards`; con matchmaking, se dopo filtro forza restano < 5, allarga fino a usare tutto il pool usato ora (released o cards). |
| **Tutte le carte nella banda sono molto simili tra loro** | La “risposta” non cambia molto il ranking. | Nessun problema: prendi le 5 con counter score più alto (o random tra top N come da tua scelta). |

Riassunto fallback consigliato:

1. Filtra pool per forza (banda o quantile).
2. Se candidati < 5 → allarga banda/quantile (es. raddoppia δ o includi quantili adiacenti) e riprova.
3. Se ancora < 5 → ignora filtro forza, usa tutto il pool; applica solo lo scoring “risposta” e prendi 5 carte.
4. Se il pool totale è < 5 → comportamento attuale (usa tutto quello che c’è).

---

## 7. Riepilogo parametri da decidere

- **Forza**: formula (Power+Social vs pesata) e eventuali pesi.
- **Simile**: banda percentuale (δ?) vs quantile (quale range di quantile?).
- **Profilo**: 3 livelli (tank / glass cannon / bilanciato) con soglie, o formula continua (α, β in funzione di ratio).
- **Scelta 5 carte CPU**: deterministico (top 5) vs random tra top N vs pesato.
- **Fallback**: conferma che va bene “allarga banda → poi tutto il pool + solo risposta” quando i candidati sono < 5.

Quando hai scelto queste preferenze, si può tradurre tutto in pseudocodice e poi in codice in `torcha.js` senza toccare il resto della battaglia (solo la funzione che costruisce il mazzo CPU).

---

## 8. Proposte per rendere l’esito più imprevedibile

Dopo aver introdotto matchmaking + risposta, la CPU può risultare troppo vincente. Idee per aggiungere **varianza** senza stravolgere le regole:

### A. **Varianza sul danno (per colpo)**
- Ogni colpo non fa esattamente `Power`, ma `Power * (0.85 + random(0, 0.30))` → danno tra ~85% e 115% del Power.
- Oppure: `Power + random(-10, +10)` (con minimo 1) per dare swing casuali.
- **Pro**: ogni partita può andare diversamente; **contro**: il log mostra numeri “strani”.

### B. **Varianza sul danno (un solo roll per battaglia)**
- All’inizio della battaglia tiri un moltiplicatore per te e uno per la CPU, es. `0.9 + random(0, 0.2)` → tra 90% e 110% del danno per tutta la partita.
- **Pro**: imprevedibilità senza numeri diversi a ogni colpo; **contro**: meno swing round-by-round.

### C. **Ordine di attacco meno “ottimale” per la CPU**
- Oggi l’ordine delle carte (chi colpisce quando) è random per entrambi. Si potrebbe lasciare il giocatore con ordine random ma dare alla CPU un ordine **sempre random** (già così) oppure leggermente **peggiorato** (es. le carte della CPU vengono usate in ordine di Power crescente invece che random, così le più forti non arrivano subito).
- **Pro**: la CPU fa meno “burst” early; **contro**: cambia solo il timing, non la forza media.

### D. **Diluire la “risposta” della CPU**
- La CPU oggi sceglie carte che contrastano il tuo profilo (tank/glass cannon/bilanciato). Possiamo **mescolare** di più: es. prendere le carte random tra le top **2*N** (invece che top N) per N = carte uniche, così a volte la CPU non ha il mazzo perfettamente contro.
- Oppure: con probabilità 30% la CPU ignora il counter score e pesca random dal pool matchmaking.
- **Pro**: partite più varie e meno “sempre contro il mio mazzo”; **contro**: la CPU è un po’ meno “intelligente”.

### E. **Bonus leggero random al giocatore**
- Una volta a battaglia: “fortuna” → il tuo prossimo colpo fa 120% danno, o la CPU ne fa 80% per un colpo. Implementabile con un roll all’inizio (es. 25% prob che tu abbia “advantage” per un colpo a scelta o random).
- **Pro**: sensazione di colpo di fortuna; **contro**: può sembrare “invento vittorie”.

### F. **Primo colpo sempre al giocatore (o più spesso)**
- Oggi first attacker è 50/50. Se fosse **sempre il giocatore** (o 60% giocatore / 40% CPU), in media il giocatore ha un vantaggio tattico (può abbattere prima).
- **Pro**: semplice, nessun numero strano; **contro**: meno varietà su chi inizia.

---

**Raccomandazione:** partire da **A** (varianza sul danno per colpo, es. ±15%) oppure **D** (diluire la risposta CPU) per riequilibrare senza cambiare la sensazione “ogni colpo conta”. Se vuoi massima semplicità, **F** (primo colpo più spesso al giocatore).
