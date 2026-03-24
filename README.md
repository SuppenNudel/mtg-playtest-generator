# MTG Playtest Generator (Web App)

Live page: https://suppennudel.github.io/mtg-playtest-generator/

A small browser-based tool to generate printable Magic: The Gathering playtest sheets.

## What it does

- Parses a card list with optional quantities (for example: `4 Lightning Bolt`)
- Downloads card images from Scryfall (including double-faced cards)
- Supports multiple card languages
- Builds a letter-sized PDF with a 3x3 card grid and cut lines

## Project files (web)

- `index.html` – UI layout
- `app.js` – card lookup, image download, preview, and PDF generation logic
- `styles.css` – page styling

## How to use

1. Open `index.html` in a modern browser.
2. Paste your card list into the text box (one card per line).
3. Choose a language.
4. Click **Download Images from Gatherer** (button label from current UI).
5. Click **Generate Playtest PDF**.
6. Save the downloaded `playtest_cards.pdf`.

## Card list format

- With quantity: `3 Counterspell`
- Without quantity (defaults to 1): `Black Lotus`

## Notes

- The web app currently fetches card data/images via Scryfall APIs in `app.js`.
- Generated PDF is US Letter (`8.5 x 11`) with card size `2.5 x 3.5`.
- If some cards fail to download, the tool continues with successful cards.

## Local-only files

Some older project files may still exist in your local working folder for reference, but they are not part of the tracked web app repository.

This Git repository is intended to contain only the browser app:

- `README.md`
- `index.html`
- `app.js`
- `styles.css`
