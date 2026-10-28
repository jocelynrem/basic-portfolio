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

Six skills contain 19 rounds:

- Click 1–4 in order: still, slow, then fast. Moving rounds offer Slow, Medium,
  Fast, and Extra fast speeds, plus pause and reduced-motion support.
- Drag flat squares, circles, triangles, and rectangles into three picture puzzles:
  a house, robot, and rocket (11 pieces total).
- Scroll to find six exact picture-and-number cards. The target stays visible.
- Zoom a rocket picture to fit four visible frames; no percentage reading required.
- Turn a genuine 3D cube to match three large pictured symbols.
- Hold Shift and right-drag the workplane to park a rover three times.

Visual targets, mouse-button diagrams, brief action cues, and persistent checkmarks
provide instructions and feedback without sound. Flat shapes use familiar 2D
names (square, circle, triangle, rectangle, hexagon). Students click Next round
or Next skill to continue; the next skill unlocks after all rounds. Completed
skills can be replayed. Restart round repeats the current round.

The blue workplane is a setting for mouse practice, not a full Tinkercad editor.
Use a two-button mouse and keyboard for the intended gestures. Keyboard alternatives
are available in each skill. Progress and speed choices last until refresh; there
are no accounts, saved student data, or audio requirements.

Tinkercad control reference: https://assets.ctfassets.net/jl5ii4oqrdmc/6TNFVIF89KMN9CPLLH97U0/cc996201b4d443c63c84b54a26c1891b/Tinkercad_keyboard_shortcuts_1_up.pdf

Run interaction regression checks with:

```bash
node --test mouse-makers/tests/interaction.test.cjs
```
