# Figma Tokens → HTML Styleguide

A multi-client workflow for converting Figma variables into CSS custom properties and generating interactive HTML styleguides. Built for WordPress page builders like Bricks Builder and Divi.

## What This Does

1. **Imports Figma variables** (via Token Press) and transforms them into organized CSS custom properties
2. **Generates a living styleguide** — color swatches, WCAG contrast table, typography scale, and component demos
3. **Serves multiple clients** from one repo, each with their own tokens, CSS, and styleguide

---

## Two Pipelines

### Simplified (new clients — Token Press)

For new clients using **Token Press** in Figma. Exports one JSON per collection; variables use leaf-name-only convention.

- Variable `Components - Buttons > color-variations > primary > btn-primary-bg-color` → `--btn-primary-bg-color`
- References resolve to `var(--leaf-name)`: `{color.brand.purple}` → `var(--purple)`
- Dimensions auto-convert px → rem. Colors auto-convert rgb()/rgba() → hex.

This introduces a new W3C DTCG-format pipeline alongside the legacy one:

- `scripts/import-tokens.js` — unzips Token Press exports, strips $extensions, writes \_meta.json
- `scripts/build-tokens.js` — branches on config-{client}.json; leaf-name CSS vars, px→rem, hex colors, font fallbacks
- `scripts/generate-html.js` — per-client HTML generation with Google Fonts / Typekit support
- `scripts/build-all.js` — Parcel builds all clients to dist/{client}/
- `css/codesnippet-simplified.css`, `css/styleguide-simplified.scss` — styleguide styles for simplified clients
- `js/styleguide.js` — swatch + typography + WCAG contrast logic, branched on window.PIPELINE
- Adds chroma as first simplified client (config + tokens + index HTML)
- Removes fonts.css.template (replaced by generated CSS)

### Legacy (fcp, sqmhc — Design Tokens plugin)

For existing clients using the original Design Tokens plugin export. Expects collections named `primitives`, `typography`, `blocks`, `tokens`. This pipeline is stable — do not modify it.

---

## Quick Start — Adding a New Client

### 1. Set up the client config

Create `tokens/config-{slug}.json`:

```json
{
  "pipeline": "simplified",
  "excludeCollections": ["typography", "mockup-only"],
  "googleFonts": ["Poppins:wght@400;700"],
  "collectionOrder": ["primitives", "tokens-colour"]
}
```

| Option               | Description                                                                          |
| -------------------- | ------------------------------------------------------------------------------------ |
| `excludeCollections` | Collection filenames to skip. Always exclude `"typography"` (composite text styles). |
| `googleFonts`        | Generates `@import` in CSS and `<link>` tags in HTML.                                |
| `typekitId`          | Adobe Fonts kit ID — generates `@import url('https://use.typekit.net/{id}.css')`.    |
| `collectionOrder`    | Optional sort override. Default: primitives → tokens-_ → components-_.               |

### 2. Export from Figma and import

In Figma, export all collections from **Token Press** as a zip. Save to your Desktop, then:

```bash
npm run update -- {slug}
```

This imports `~/Desktop/tokens.zip` for the given client and rebuilds the CSS.

### 3. Build and preview

```bash
npm run html       # generate src/index-{slug}.html
npm run build      # Parcel build → dist/{slug}/
npm run preview    # serve at localhost:8080
```

---

## All npm Scripts

```bash
npm run update -- {slug}        # import ~/Desktop/tokens.zip + rebuild CSS
npm run import -- <zip> <slug>  # import any zip to tokens/import-{slug}/
npm run tokens                  # rebuild CSS for all clients
npm run html                    # regenerate all HTML styleguide pages
npm run build                   # full Parcel build → dist/
npm run preview                 # serve dist/ at localhost:8080
npm run dev                     # tokens + HTML + Parcel dev server (all clients)
```

---

## Project Structure

```
├── tokens/
│   ├── config-{client}.json       # Simplified pipeline config (one per client)
│   ├── import-{client}/           # Token Press import folder (auto-generated)
│   │   ├── _meta.json             # Collection name mapping
│   │   ├── primitives.json
│   │   └── tokens-colour.json     # (etc.)
│   ├── figma-{client}.json        # Legacy: raw Figma export
│   └── tokens-{client}.json       # Legacy: processed tokens
├── build/
│   └── css/
│       ├── variables-{client}.css  # Generated CSS custom properties
│       └── utilities-{client}.css  # Generated color utility classes
├── css/
│   ├── codesnippet.css             # Legacy: production component styles
│   ├── codesnippet-simplified.css  # Simplified: production component styles
│   ├── styleguide.scss             # Legacy: styleguide-only styles
│   └── styleguide-simplified.scss  # Simplified: styleguide-only styles
├── js/
│   └── styleguide.js              # Interactive styleguide (swatches, typography, WCAG)
├── scripts/
│   ├── build-tokens.js            # Style Dictionary build (both pipelines)
│   ├── import-tokens.js           # Unzip Token Press export
│   ├── generate-html.js           # Generate per-client HTML
│   └── build-all.js               # Parcel build for all clients
├── src/
│   └── index-{client}.html        # Per-client styleguide source (auto-generated)
└── dist/
    └── {client}/
        └── index.html             # Built styleguide
```

---

## Font Fallback Stacks (Simplified Pipeline)

To add fallback font stacks, create two types of Figma primitives:

- `font-family-sans`, `font-family-serif` — your actual web fonts
- `fallback-sans`, `fallback-serif` — fallback stack strings (e.g. `Arial, Helvetica, sans-serif`)

The build automatically appends `, var(--fallback-sans)` to `--font-family-sans` in the CSS output. Semantic variables that reference `font-family-sans` inherit the fallback through CSS variable resolution — no duplication.

---

## Styleguide Features

- **Color Palette** — Brand Colors, Tints, Color Tokens, Grayscale, Utilities (auto-detected by naming convention)
- **Typography Scale** — h1–h6, display, poster (if variables exist), paragraphs; with mobile/tablet/desktop sizes, weights, line heights
- **WCAG Contrast Table** — all brand color combinations meeting AA minimum, filterable by compliance level and background color
- **Button, Card & Section demos** — styled via the generated CSS variables

---

## WordPress Integration

After building, enqueue two CSS files in your theme or via Code Snippets:

```php
wp_enqueue_style('design-tokens', get_stylesheet_directory_uri() . '/css/variables-{client}.css');
wp_enqueue_style('components',    get_stylesheet_directory_uri() . '/css/codesnippet-simplified.css');
```

Reference variables in Bricks, Divi, or any page builder:

```css
var(--color-primary)       /* semantic brand color */
var(--spacing-md)          /* spacing */
var(--heading-h1-lg)       /* desktop h1 size */
var(--font-family-base)    /* body font with fallback stack */
```

---

## Browser Support

CSS Custom Properties are supported in all modern browsers (Chrome/Edge 49+, Firefox 31+, Safari 9.1+).

---

## Acknowledgments

Built with:

- [Style Dictionary](https://github.com/style-dictionary/style-dictionary) — token transformation
- [Parcel](https://parceljs.org/) — development bundler
- [Token Press](https://www.figma.com/community/plugin/1255249848485403) — Figma token export
