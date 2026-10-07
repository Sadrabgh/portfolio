# AURUM — Mint studio

Approved direction: the user's mint storefront concept, 2026-10-07. Complete concept store with illustrative checkout; no real payments or external form submissions.

## Visual system

- Off-white #f7f8f4, sage-mint #d0ded0, ink #141613, secondary text #566052, focus #32573e.
- Local variable Latin font already present in the project, clean sans typography; no remote font requests.
- Wide asymmetrical hero, four-line title, small lifestyle image, three pill category links, three featured cards, split editorial story, quiet compact footer.
- Media radius 24px, pills 999px, thin 1px rules, spacious 8px rhythm, up to 1400px content width.
- English storefront matching the selected artboard. Persian case-study copy for the main portfolio.
- Six concept products, three categories, three curated collections, product pages, saved items, bag, checkout/review/receipt, story, two journal articles and help/contact pages.

## Motion decisions

- Immediate press and focus feedback. Fine-pointer image hover 400ms, press 130ms. Core mobile controls keep a 44px touch target.
- Search and mobile-menu dialogs: 260ms enter / 160ms exit; interruptible CSS transitions with native dialog focus handling, @starting-style and discrete display/overlay transitions. Older browsers retain native open/close without blocking focus.
- Cart drawer: 300ms enter / 180ms exit, from the right-side bag trigger.
- Product UI and above-fold hero are immediately visible. Only editorial marketing blocks reveal once over 700ms, 14px travel.
- Respect reduced motion in JavaScript and CSS, retaining restrained color/opacity feedback. Native scrolling, no looping decoration.

## Guidance applied

ui-ux-pro-max design-system query was reviewed; its vibrant blocks, urgency-orange palette and serif typography did not fit the selected reference and were not persisted. The explicit Minimalism & Swiss Style retry supplied general grid/hierarchy/contrast guidance, rather than a jewelry-specific match. Astro stack guidance applied where compatible with the installed Astro 5: responsive build-time images, fixed media dimensions and lazy loading below the fold. ui-animation decision framework, transition recipes and scroll guidance inform the motion timings above.

## Validation scope

Basic Astro check/build plus desktop/mobile browser checks, search/category filter, variant selection, saved items, bag quantities, checkout/review/receipt, menu/search dialog and reduced-motion behavior. No exhaustive performance audit requested.

Validated: Astro check, 0 errors/warnings/hints; production build, 209 pages. `tests/aurum-basic.mjs` passed desktop 1440px, mobile 390px and narrow 320px layout checks, category/search/empty state, selected ring size and necklace length through anonymous receipt, quantity editing, discount/shipping/gift arithmetic, mobile dialogs and quick add, reduced-motion behavior, demo contact form and main portfolio links. Browser emulation was used; no claim of a physical-device run. Real UI captures and the basic report are in `output/aurum/`.
