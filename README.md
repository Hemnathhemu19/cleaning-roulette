# Cleaning Roulette

**Who's cleaning today?** Spin it. The wheel decides, nobody argues.

A small, dependency-free web app for splitting house chores fairly. Works on phones, tablets and desktop, and keeps everything on your device (`localStorage`).

## Features

### Spinning wheel
- Flat, high-DPI canvas wheel with labels that resize to fit any screen.
- Smooth 60fps spin (GPU-rotated), pointer tick sound and haptics on phones.
- The slice under the pointer is always the announced result.
- Tap the wheel, press the button, or hit <kbd>Space</kbd> to spin. Turbo mode for quick spins.

### Wheel modes
- **Room** – 16 room chores, including a surprise slot.
- **Bathroom** – bathroom-only chores.
- **People** – the squad: Thirupathi, Ramanan, Hemnath, Vaseem, Hrabiullah, Sakthi, Dineshkumar.
- **Combo** – picks a person and a chore in one spin.

### Weekly roster
- Assigns the three major chores (dishes, floor, bathroom) each week.
- Bathroom rotates: last week's person is never picked twice in a row.
- Refuse a chore and you take on two instead.
- Fairness score per person and a rotation history.

### Room expenses
- Monthly allocation for room maintenance and utility purchases: **₹1,000 per month** (editable).
- Log each purchase with amount, type (Maintenance / Utilities), who paid and the date.
- Live spent / left totals, a budget bar that warns at 80% and turns red when over.
- Switch between months, delete entries, and share a month's summary with per-person totals.

### Also included
- Speed clean timer (5 / 10 / 15 min) that stays accurate when the phone locks.
- Today's checklist with progress bar.
- Edit, add, disable or delete slices; presets for Room, Bathroom and The squad.
- Recent spin history, share/copy results, light and dark themes.

## Run it

Open `index.html` in any modern browser. No build step.

Or serve the folder locally:

```bash
python -m http.server 5173
```

Then visit http://localhost:5173.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Design system and responsive layout |
| `app.js` | Wheel, modes, roster, checklist, timer |
| `confetti.js` | Celebration confetti |
| `audio.js` | Synthesized sound effects (Web Audio) |
