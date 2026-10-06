# Sukin skincare concept — design and implementation

Date: 2026-10-04. Independent fifth portfolio project, Persian RTL, 13 demo routes plus `/work/sukin/`.

## Direction

The three supplied mobile references define the direction: pale lavender-gray canvas, white rounded surfaces, dark pump bottles, botanical foliage, black primary actions and staggered catalog cards. The generic UI UX Pro Max ecommerce style result was overridden by the user's specific reference. Its Soft UI Evolution guidance was used for readable contrast, focus visibility, subtle depth and restrained feedback. Yekan Bakh replaces the reference's Latin typeface.

Desktop uses a three-column catalog alongside a sticky botanical product panel; tablet uses two columns, and mobile uses two staggered columns with dedicated navigation. The mobile product route has a compact header, gallery, three value tiles and a white purchase panel. Navigation remains available through the header and breadcrumb; the lower navigation is omitted on this route to keep the purchase controls accessible.

## Tokens

| Token           | Light   | Dark    |
| --------------- | ------- | ------- |
| Canvas          | #efedf1 | #202220 |
| Surface         | #ffffff | #2a2d29 |
| Soft background | #e9e7ed | #282b29 |
| Primary text    | #1e201d | #f5f3ef |
| Secondary text  | #66665f | #b8bdb1 |
| Accent          | #4d6244 | #bdcfaa |
| Border          | #d8d6dc | #44483e |

Body: Yekan Bakh regular, 16 px with 1.7 line height. Titles and primary controls: semibold. Cards: 23–25 px corners. Product and overlay surfaces: 28–35 px corners. Important touch controls: at least 44 px. Content width: 1344 px maximum. Theme starts light and persists only after explicit selection.

## Motion

| Interaction              | Behavior                                                    | Duration           |
| ------------------------ | ----------------------------------------------------------- | ------------------ |
| Product-card hover       | Bottle rises slightly; discovery label fades in             | 180–450 ms         |
| Filter and sorting       | FLIP from current position; previous animation cancelled    | 340 ms             |
| Product navigation       | One selected image shared across documents                  | 420 ms             |
| Cart opening/closing     | Left drawer on desktop, lower sheet on mobile               | 300 ms             |
| Filter and zoom          | Fade and small displacement                                 | 250 ms             |
| Gallery                  | Decode next image, latest request wins, short slide/fade    | 260 ms             |
| Save/cart-count feedback | Single scale pulse                                          | 240–250 ms         |
| Featured bottle          | Pointer-based displacement limited to 9/6 px, RAF-coalesced | 380 ms retargeting |

Only transform and opacity animate spatial changes. Native dialogs manage modal focus and Escape. Theme changes do not animate across unrelated surfaces. No automatic carousel, constant floating, scroll hijacking or hidden catalog reveals. `prefers-reduced-motion` cancels WAAPI effects, skips document transitions and disables CSS animation and transition. Shared image names are applied only during snapshot capture, following [Chrome's cross-document transition guidance](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).

## Interaction and boundaries

Eight products, four categories, normalized Persian/Arabic search, three sort modes plus recommended order, price ceiling and availability filtering. Each product has a separate route. Only genuinely available image variants get gallery controls. One sample product is unavailable. Favourites, bounded quantities, Undo, discount and shipping calculations work locally.

Shipping is free at 1,200,000 toman in product subtotal before discount; otherwise 65,000 toman. NATURE10 discounts products by ten percent. All prices, stock and delivery are demonstration data. Checkout validates Persian and Arabic digits, supports review/editing and produces a demonstration receipt. It sends no request and retains no receiver identity data. Local storage accepts only allowlisted IDs, integer quantities clamped to catalog stock, the discount flag and appearance choice. Dynamic values use textContent. The relevant ASVS 1.2.1, 2.2.1 and 14.3.3 guidance is noted in source.

## Artwork brief and files

The generation briefs below summarize the two Imagegen requests; they are not claims that the concept packaging is an official product photograph.

1. Recreate only the reference's front-facing dark Sukin pump bottle, black label and botanical arrangement: eucalyptus leaves, pods and a small branch around the bottle; realistic studio lighting, crisp edges, true transparent background, no phone, screen or interface.
2. Use that generated botanical composition as the reference; isolate the matching pump bottle, remove all foliage and pods, preserve the product identity, perspective and lighting, with a true transparent background and no interface.

Original PNGs:

- `C:/Users/-User-/.codex/generated_images/01a10133-6a4b-7421-8f25-affe52720af0/exec-666213f9-52dd-45b1-b3c4-cc086d1575de.png`
- `C:/Users/-User-/.codex/generated_images/01a10133-6a4b-7421-8f25-affe52720af0/exec-967bb5e5-444f-48a3-8ac6-cfed12ce33d9.png`

Site exports: `public/art/sukin/facial-botanical.webp` (1300 px wide) and `facial-bottle.webp` (900 px wide). Alpha is preserved. Other packshots are locally hosted optimized photographs; exact sources are in `public/art/sukin/sources.json`. Portfolio previews are browser captures, not generated UI pictures.

## Verification

`npm run check`, `npm run build`, `npm run test:sukin` and the Moonex regression suite are the relevant checks. `verification-sukin.json` records the executed browser checks and their outcome. `tests/sukin-capture.mjs` records desktop, overview, mobile, product and drawer images in `output/playwright/sukin`; `--portfolio` exports the four live-page screenshots used by the case study.

The checkout is a frontend demonstration. Real catalog administration, accounts, payment, order persistence, legal product claims and fulfillment require a separate production implementation.
