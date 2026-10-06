# Four demo identities — UI/UX upgrade

Scope: all 31 demo routes. Astro, local Vazirmatn variable font, existing local imagery and interactive Three.js models. The main portfolio keeps its design; its eight demo preview images are regenerated.

## Design decisions

| Demo | Direction | Light palette | Primary experience |
| --- | --- | --- | --- |
| Atelier No | Warm architectural editorial, asymmetric projects, generous negative space | Parchment `#f5f2ea`, charcoal `#302e29`, brick `#a33326` | Discover a project, examine photographs and the model, describe a space, review, complete or restart |
| RIFT | Oversized campaign typography, acid color block, precise retail details | Ivory `#f4f3ed`, ink `#1c1d19`, acid `#d9f36f` | Filter the collection, select a color directly, choose an available size, edit the cart, review a demonstration order |
| VELO | Industrial design studio, model first, grouped configuration | Mist `#edf1f0`, white `#fafcfb`, deep cyan `#076976` | Select model and color, optionally open advanced settings, inspect parts, save and restore configuration |
| Neva | Warm healthcare navigation, calm green, visible steps | Warm white `#f5f6f0`, forest `#223e36`, green `#28664c` | Choose service and doctor, compare availability, choose a time, review, manage a demonstration appointment |

Dark themes have independent surface, ink, muted, border and accent tokens. Campaign surfaces retain their own foreground colors in both themes.

## Guidance applied

Explicitly requested skill: `ui-ux-pro-max`. Searches were run against architecture/editorial, streetwear/ecommerce, bicycle/configurator, healthcare/appointment, and the detected Astro stack. Results were evaluated against this project rather than copied literally. The initial veterinary result for Neva was rejected and replaced with a healthcare query. VELO had no verified specialized match after a retry; its direction uses the skill's general UX priorities and the existing configuration behavior.

Shared principles: sequential headings, SVG icons, visible focus, native buttons and form controls, explicit selection states, readable contrast, small-screen reflow, keyboard alternatives for the model, reduced motion, nearby errors, and recoverable completion states.

## Interaction contract

- Shared navigation has an accessible menu disclosure, Escape closes it, and resizing to desktop clears the mobile menu state. Contextual breadcrumbs preserve a route back to the parent archive, catalog or doctor list.
- RIFT filters are encoded in the URL and restored on navigation/reload. Only existing select options and known product color IDs are accepted. User-derived labels use text nodes.
- VELO advanced options begin collapsed at every width and remain available in a native disclosure. Saved configurations retain their existing validated storage format. All five choices are encoded in a reproducible URL; unknown values fall back to valid defaults.
- Atelier review preserves edits; confirmation clears the form and exposes a focused completion panel with a fresh-request action.
- Neva preserves its real four-step booking and rescheduling behavior. Appointment storage excludes names and contact information.
- All four remain clearly labeled as conceptual demonstrations. No payment, live appointment, medical service or project submission is represented as real.

## Implementation and verification

Identity overrides: `src/styles/demo-upgrade.css`, imported after the existing v10 styles. Shared shell: `src/layouts/Brand.astro`. Reusable product and doctor headings support the appropriate semantic level.

Existing regression commands: `npm run check`, `npm run build`, `npm test`, `npm run test:gallery`. `V10_DEMOS_ONLY=1 npm run capture` refreshes demo captures and portfolio previews without changing the main social image. Playwright screenshots are converted to WebP with the existing Sharp dependency.

The model drag regression starts on empty canvas space and verifies that it is outside a detail button. The new layout intentionally places an interactive hotspot near the canvas center; dragging a hotspot remains a detail action.

Automated accessibility results and additional mobile checks are recorded in `qa-demo-upgrade.json`. Automated checks supplement visual and keyboard inspection; they do not constitute a full assistive-technology conformance certification.

## Second refinement — 2026-10-03

The second pass responds to visual review of the first upgrade. The opening of Atelier now places the main photograph next to the introductory thought rather than after a long text block. A three-project rail makes the scope immediately discoverable; project studies have a sticky section index that works without JavaScript and highlights the current section when JavaScript is available.

Neva pairs the introductory content with the clinic photograph and the nearest available general appointment. The service finder spans the page on desktop and takes priority on mobile. Booking keeps the selected doctor's portrait and room in the summary, indicates completed steps, gives contextual guidance, and distinguishes successful time selection from errors.

RIFT adds category entry points and an image-led campaign product link. Quick selection is available wherever product cards are rendered: known colors, available sizes, a selected-variant detail link, and the existing cart. The native dialog supports Escape and restores focus. With JavaScript disabled, its trigger stays disabled and product links remain available.

VELO makes model choices easier to compare in a compact row, keeps advanced options collapsed, and presents a live description of the selected form. Model, color, finish, size, and environment survive a shared URL, refresh, save, and restore. Clipboard failure exposes selected text for manual copying with honest feedback.

The refinement stylesheet is `src/styles/demo-refinement.css`. The shared footer adds a typographic brand signature. Existing local imagery, fonts, and model geometry are retained. The 31-route mobile accessibility audit found two horizontally scrolling tables that lacked keyboard focus; both now expose named, focusable regions.

Skill evidence: the architecture/editorial design-system query returned relevant visual-first and portfolio composition guidance. Two specialized interaction queries (progressive disclosure and quick selection), each retried once, did not return a valid match. Their implementations use the skill's general navigation, selection, accessibility, feedback, and responsive priorities rather than claiming specialized search support.

Latest verification is recorded in `qa-demo-refinement.json`; the earlier report remains available as the first-pass record. The eight portfolio demo previews are regenerated from the second-pass implementation.
