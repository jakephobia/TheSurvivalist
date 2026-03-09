# Torcha Battle – Alternative mechanics (Power, Social, RNG)

Two concrete proposals that replace the current "5 rounds, card vs card, compare damage" with a different engine and a clearer, more readable presentation.

---

## Proposal A: **Clash (Power vs Social phases)**

### Idea
The battle is **two clear phases**: first the "Power" clash, then the "Social" clash. Each phase produces one point. If it's 1–1, a **tiebreaker** duel (one card vs one card with RNG) decides the match.

### Engine
1. **Power clash**
   - Your side: sum of your 5 cards' **Power** + one global RNG roll (e.g. ±20).
   - CPU side: same with their 5 cards.
   - Higher total wins the **Power** point (or "Power phase").
2. **Social clash**
   - Your side: sum of your 5 cards' **Social** + one global RNG roll (e. g. ±20).
   - CPU side: same.
   - Higher total wins the **Social** point.
3. **Tiebreaker** (only if 1–1)
   - Pick one random card from your deck and one from CPU deck.
   - Battle score = `power + social * 0.5 + (random -10..+10)` for each; higher wins the match.

Result: **2–0**, **0–2**, or **1–1 → tiebreaker winner**. No "best of 5" rounds; just 2 (or 3) clear moments.

### Graphics
- **Top:** Two rows: "Your tribe" (5 small cards with Power/Social visible) and "CPU tribe" (same).
- **Phase 1:** One row: "POWER CLASH" with two big numbers (or two short horizontal bars) — yours vs CPU. Under each number, a short formula hint: e.g. "Sum Power ± luck". Winner gets a badge ("You win" / "CPU wins").
- **Phase 2:** Same layout for "SOCIAL CLASH".
- **If 1–1:** "TIEBREAKER" — two larger card placeholders (your random card vs CPU random card), each with its battle score; winner highlighted.
- **Bottom:** Final "Victory" or "Defeat" with a clear style (colour + optional icon).

Progressive reveal: show Power clash → short delay → Social clash → if needed, tiebreaker → then Victory/Defeat.

---

## Proposal B: **Tug-of-war (bar race)**

### Idea
A **single horizontal bar** (tug-of-war). Over 5 "pushes", you and the CPU each add strength to your side. The bar moves left (you) or right (CPU). After 5 pushes, whoever has the bar on their side wins. Each push uses one card from the deck (in order or random) and combines Power + Social + RNG.

### Engine
1. One shared "balance" value: starts at 0. Positive = your side, negative = CPU side.
2. For each of 5 steps:
   - Your push: `(card.power + card.social) * 0.5 + (random -15..+15)` (or similar). Add to balance.
   - CPU push: same with their card. Subtract from balance (or add negative).
   - So each step: balance += yourPush - cpuPush.
3. After 5 steps, if balance > 0 you win, else CPU wins. (Optional: clamp balance so the bar doesn’t go off-screen; e.g. -100..+100.)

So both **Power** and **Social** (and RNG) drive each push; the bar is the only "score" the player tracks.

### Graphics
- **One horizontal bar** (e.g. 100% width, 24–32px height). Centre = 0. Left half = "You", right half = "CPU". A marker (e.g. a vertical line or a small icon) shows current balance; it moves each step.
- **Each step:** Show the card that "pushed" (small thumbnail + name) for you and for CPU, and the delta (e.g. "+12" / "-8") so the movement is clear. Optional: short animation (bar moves toward the new balance).
- **After 5 steps:** Bar stays at final position; big "Victory" or "Defeat" below.

Progressive reveal: step 1 (bar moves) → step 2 → … → step 5 → Victory/Defeat. Delay between steps ~500–700 ms.

---

## Comparison

| | **A – Clash** | **B – Tug-of-war** |
|---|----------------|---------------------|
| **Power/Social** | Explicit: one phase Power, one phase Social. | Both in every push (e.g. power+social + RNG). |
| **RNG** | One roll per phase (+ tiebreaker). | One roll per card per step (more variance). |
| **Readability** | Very clear: "Power phase" then "Social phase" then maybe tiebreaker. | Single bar; easy to see who’s ahead. |
| **Feel** | "Two stats, two moments". | "Back and forth" tension. |
| **Implementation** | Two sums + optional third 1v1. | Loop 5 times: your push, CPU push, update balance. |

---

## Recommendation

- **Proposal A** if you want Power and Social to be **visually and mechanically separate** (good for teaching what each stat does).
- **Proposal B** if you want one **simple, visual object** (the bar) and a more "gamey" tension round by round.

Once you choose (or mix: e.g. A’s engine with B-style bar for Power/Social), the next step is to implement that engine in `torcha.js` and the corresponding UI in the Battle panel and CSS.
