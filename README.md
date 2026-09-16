# Parcl Buyer Segmentation - Web Dashboard

A standalone HTML/CSS/JS dashboard (no build step, no framework) presenting the real
clustering results from the Python pipeline in the parent project. Every number in
`js/data.js` was computed by `scripts/01_build_features.py` / `scripts/02_train_model.py`
against the actual `clients.csv` / `properties.csv` - see `reports/evaluation_report.md` in
the parent project for how to reproduce them.

## Running it

Any static file server works - there's no backend:

```bash
cd web-dashboard
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `index.html` directly in a browser. The only network dependency is the Chart.js
CDN script (`cdnjs.cloudflare.com`) and Google Fonts - both optional in the sense that the
page still functions without them (fonts fall back to system sans/serif; without Chart.js
the chart canvases would stay empty, everything else on the page still works).

## What's real vs. what's a documented simplification

- **Real:** every KPI, chart, and cluster profile is sourced from `js/data.js`, which
  contains the actual trained-model output (see the file's header comment for provenance).
- **Documented simplification:** the in-browser "Classify a buyer" tool
  (`js/predictor.js`) re-implements nearest-centroid classification using min-max
  normalization for a simple, dependency-free browser calculation. It is **not** a literal
  copy of the Python pipeline's `StandardScaler` + full 87-dimension K-Means distance
  (which includes one-hot encoded categorical features) - it works only on the 7 numeric
  RFME-style features, against the same real cluster centroids. This means it will usually
  agree with the Python model but is not guaranteed to match it exactly for borderline
  cases. This is called out in the tool's result panel copy, not hidden.

## Assumptions made during development

- No design brief specified light or dark as the default - the page follows the visitor's
  OS-level `prefers-color-scheme` on first visit, then remembers their explicit choice via
  `localStorage` (falls back gracefully if storage is unavailable, e.g. private browsing).
- "Fully functional web application" was interpreted as: usable end-to-end without a
  backend or build tool, since the source project's real backend (the FastAPI service in
  `../src/api/`) already exists separately and this dashboard is the presentation layer for
  its underlying data and model.
- The monthly transaction dip in late 2025 is presented with an explicit caveat (partially
  a data-cutoff/censoring artifact, not necessarily a demand signal) rather than as a clean
  trend, because that's what the underlying data supports - see the chart caption and
  `reports/limitations_and_ethics.md` in the parent project.

## Design choices (best practices) vs. functional requirements

The brief asked for smooth animation, interactivity, responsiveness, semantic HTML,
modular CSS, and commented JS. Within that:

| Functional requirement | How it's met |
|---|---|
| Responsive across devices | CSS Grid app shell that collapses to an off-canvas drawer under 960px (`css/responsive.css`); charts resize via a debounced `resize` listener. |
| Semantic HTML / accessibility | `<nav>`, `<main>`, `<section>`, `<header>`, `<footer>`; skip link; visible focus states; `aria-live` on the predictor result; `aria-expanded`/`aria-pressed` on interactive controls; charts have descriptive `aria-label`s. |
| Modular CSS | Seven single-purpose stylesheets (`variables`, `base`, `layout`, `components`, `charts`, `animations`, `responsive`) loaded in dependency order - no inline styles. |
| Clean, commented JS | Five files split by responsibility (`data`, `utils`, `charts`, `predictor`, `main`), each with a header comment explaining its role; functions are small and named for what they do. |
| Smooth, non-distracting animation | One orchestrated page-load sequence (sidebar/topbar/KPI cards), plus motion that only fires in response to a person's action (expanding a cluster card, submitting the predictor, toggling theme) - not scroll-triggered fade-ins on every section. `prefers-reduced-motion` is respected throughout. |

The specific palette (navy/brass/teal/rust), the two-typeface system (Source Serif 4 +
IBM Plex Sans/Mono), and the sidebar-app-shell layout (rather than a marketing-style top
nav) are design choices made for this brief - a real-estate analytics dashboard used
regularly by analysts - not requirements stated in the brief itself. They're recorded here
so a future maintainer can tell "this was a deliberate choice" apart from "this is a hard
requirement."

## Browser support

Built and tested against a current Chromium engine (desktop 1440px and mobile 390px
viewports). Uses only broadly-supported modern CSS/JS (CSS custom properties, CSS Grid,
`IntersectionObserver`, `matchMedia`, template literals) - no bleeding-edge APIs. The one
CSS feature worth flagging for older browsers is `color-mix()` (used for a couple of
translucent border tints); it degrades to a solid fallback color in browsers that don't
support it because those declarations follow a preceding solid-color declaration for the
same property.
