# Jocelyn Remington Portfolio

Static portfolio site for Jocelyn Remington's accessible digital learning and UX work, built with:

- HTML
- Bulma
- a small custom stylesheet
- a little vanilla JavaScript for the UX sample viewer

## Open locally

You can open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then open:

- http://localhost:8000

## Mouse Makers

Open `http://localhost:8000/mouse-makers/` for student mouse practice before
Tinkercad. The portfolio includes a project card.

Six skills contain 19 rounds: number-order clicking (12 clicks: stationary, slow-moving, then faster-moving targets), shape placement
(8 drops), scrolling through a shapes panel (6 selections), zooming to four ranges,
orbiting to three faces, and three Shift + right-button drag panning challenges.
Each round has an explicit task and persistent success feedback. Students click
Next round or Next skill to continue; the next skill unlocks after all rounds.
Completed skills can be replayed, and Restart round repeats the current round.

The blue grid and basic shapes approximate a modeling workplane. This is an
independent practice activity, not a full Tinkercad editor. Use a two-button mouse
and a keyboard for the intended gestures. Expand Keyboard controls in each skill
for alternatives. Read-aloud uses browser speech synthesis. Progress is kept only
until refresh; there are no accounts or saved student data.

Tinkercad control reference: https://assets.ctfassets.net/jl5ii4oqrdmc/6TNFVIF89KMN9CPLLH97U0/cc996201b4d443c63c84b54a26c1891b/Tinkercad_keyboard_shortcuts_1_up.pdf

Run interaction regression checks with:

```bash
node --test mouse-makers/tests/interaction.test.cjs
```
