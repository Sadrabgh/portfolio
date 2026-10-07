# AURUM — Persian mint storefront

Approved visual direction: the user's original mint storefront concept, 2026-10-07. A complete, independent Persian concept store with an illustrative order journey.

## Visual system

- Off-white #f7f8f4, sage-mint #d0ded0, ink #141613, secondary text #566052, focus #32573e.
- Local Vazirmatn Arabic/Persian and Latin variable fonts, with Unicode subsets and the Persian font preloaded. Persian reading order, logical spacing, left-side cart drawer and forward arrows pointing left. The AURUM wordmark and order/coupon codes retain their Latin spelling.
- Asymmetrical hero, bold Persian headline, gold product photography, rounded media, pill categories and split editorial compositions continue the approved theme.
- Store header: a slim service note, a sticky primary bar with a clear wordmark, direct shop/collection/story/journal links, search, saved-item count and bag, then a compact category strip. On narrow screens, the primary links and categories move into a left-side drawer; search opens beside its trigger. Header controls retain their labels, focus order and Escape behavior.
- Homepage: hero, selected pieces, three collections, brand campaign, three more pieces, selection guides, journal, shopping FAQ and final collection link. The footer links all shopping and support destinations.
- Six individual products and product pages with translated variant choices, concept specifications, care and delivery information, three curated collections, brand story, four substantive journal articles with related products, five help pages, contact preview, saved items, editable bag, two-step checkout and anonymous receipt. 28 storefront routes; the project case is separate.
- No fabricated reviews, awards, external social/app links, real payment forms or contact submissions.
- Illustrative prices in toman are independent sample values, not an exchange-rate conversion or a gold-price quote. Standard delivery 120,000; express 240,000; gift packaging 180,000. Standard delivery free when the discounted product total reaches 60,000,000 toman.

## Motion decisions

- Product controls and above-fold content remain available immediately. Native scrolling throughout.
- The homepage hero enters once per session with short, overlapping text and image motion; subsequent navigation stays immediate. The mobile menu cascades its links and the search panel opens from its trigger. The sticky header gains a subtle raised state after scrolling.
- Native same-origin page transitions: 160ms page crossfade, 420ms shared product-image continuity from card to detail page. Unsupported browsers use ordinary navigation.
- Fine-pointer desktop hero has restrained CSS scroll-driven image depth, with a native view timeline and no JavaScript frame loop. Unsupported browsers keep a static image.
- Marketing narrative sections reveal once over 700ms, 14px travel. Catalog cards and purchasing controls are not gated behind a reveal.
- Collection and journal tiles join the one-time reveal, with a small stagger. Product focus and hover, saved-item reflow, changing checkout totals and the receipt checkmark provide brief state feedback.
- Keyed bag rows preserve DOM identity and focus during quantity updates. Count feedback 180ms; bag-row and filter/sort reflow use interruptible transform/opacity animations, 360ms movement / 240ms introduction. State changes synchronously.
- Native modal enter/exit 260/160ms; left drawer 300/180ms. CSS discrete transitions pair display, overlay and backdrop; native dialog provides focus and Escape handling.
- Checkout review/back feedback 260ms. Confirmation buttons hold their width while text changes and retain focus. Fine-pointer image hover 450ms, press 130ms, immediate active state.
- Reduced-motion preference disables geometric movement, scroll depth and cross-document transitions. JavaScript animations cancel if the preference changes. No looping decoration, sound or permanent will-change.

## Persistence

Existing bag and saved-item IDs/options stay compatible. Only displayed variant labels change. New anonymous receipts snapshot unit prices and currency. Old dollar receipts remain dollar receipts and are labeled as belonging to the previous version; localization never silently changes their currency. Contact details are displayed only for order review and are neither persisted nor sent.

## Guidance applied

ui-ux-pro-max Minimalism & Swiss Style and compatible Astro guidance supplied general grid, typography, build-time image and responsive-media recommendations. Its broad RTL searches returned unrelated guidance; no specialized RTL claim is based on those results. RTL implementation follows the actual reading direction, logical CSS and browser verification. ui-animation decision framework, transition recipes, contextual motion and scroll guidance inform the interaction decisions.

Native CSS references: [cross-document transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@view-transition), [animation timelines](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline). These are progressive enhancements.

## Validation

Basic Astro check/build and desktop/mobile checks only, per user preference. Current Astro check: 253 files, zero errors/warnings/hints. Production build: 211 pages across the portfolio. Browser checks and actual Persian interface captures are saved in output/aurum; no physical-device or exhaustive performance-audit claim.
