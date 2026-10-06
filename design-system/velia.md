# VELIA · reference-preserving ecommerce concept

## Direction

Three user screenshots set the visual language: ivory/lavender canvas, white rounded surfaces, asymmetric catalog columns, isolated botanical packaging, dark purchase controls. Preserve these characteristics across the expanded site. VELIA is an original fictional skincare brand; source branding and photographs must not appear in the store.

## Typography and layout

Use the user's exact YekanBakhFaNum WOFF files: Light 300, Regular 400, SemiBold 600, Bold 700, ExtraBold 800. Persian RTL, Persian prices in toman, and isolated LTR codes. Body and controls use Regular; titles use SemiBold. Font fallback remains legible while the files load.

The 1440 desktop layout places the staggered catalog beside a product spotlight. Mobile uses two catalog columns and the reference product composition: image, three values, white purchase panel. Main navigation becomes a dialog and five-item bottom navigation. Purchase controls fit above that navigation at 390 × 844; an additional purchase bar appears after the original purchase panel scrolls out of view. Layouts are checked at 320, 390, 768 and 1440 pixels.

## Site scope

Home, shop, five categories, twenty product pages, search, saved products, cart, two-step checkout and receipt, three routine collections, journal and four articles, story, FAQ, contact, tracking, four help/legal pages, demo login and account with overview/profile/addresses/orders/order detail. A single cart connects every route. Light is the default regardless of OS theme; explicit dark/light selection persists.

## Motion

The existing reference composition stays intact. The home image and two Persian title lines enter together, once per session; a critically damped pointer spring gently moves the image and settles at rest. Hover lifts the image inside a stable card hit area. Filter/sort transitions start from current visual positions, with brief inert exit copies and cancellable FLIP movement. Shared-image cross-document transitions preserve the selected artwork between catalog and product where supported.

Gallery changes, product panels and checkout steps follow RTL direction; the active tab underline moves with the selection. Keyboard tab changes are immediate. Cart rows retain their DOM identity and focus while quantities and totals update immediately, followed by visual feedback. Removal/undo, menu exits and quick reopening cancel stale motion. Native dialogs use paired entrance/exit timing. The mobile purchase bar enters and exits after scrolling, preserves focus and responds to rapid direction changes. Receipt completion brings the confirmation into view and draws its check mark.

Page transitions snapshot the header, announcement and mobile navigation separately; these stay still while the main content fades and travels 12 pixels in RTL direction. Browser back reverses that direction. The shared product image retains its own transition. Unsupported browsers keep normal navigation.

Filters and cart changes measure the enclosing results/cart block as well as the surviving items and summary. Their height and following content settle together rather than snapping. The results wrapper includes the no-results state. Off-screen items enter locally instead of flying across the entire page. Interruption captures current opacity, position and size before cancelling the previous effect. Deletion commits immediately and its inert exit copy fades out in 180 ms. Undo, empty states and repeated filtering release all temporary sizing and clipping when they settle.

Timing: press/value feedback 140–180 ms; gallery/tab/checkout movement 210–240 ms; card/container layout 300 ms; page exit/entry 180/300 ms; shared image 380 ms; drawer entrance/exit 340/190 ms; home image 600 ms. Repeated interactions replace their previous animation. Move/enter/exit/sheet/settle use separate easing curves in src/scripts/velia-motion.ts and src/styles/velia-motion.css. Animate transform/opacity, with two deliberate exceptions: the small confirmation/icon stroke and a measured height tween on the enclosing results/cart block. Grid tracks align to their content while that block resizes; no card scales its text. Release temporary animation layers at rest, cancel on page hiding and respect prefers-reduced-motion. Scroll entrance remains limited to the editorial section. Motion never postpones data changes or access to controls.

## Assets

Eight original Imagegen photographs; six packaging families are reused across twenty conceptual products. Source records are in public/art/velia/sources.json. Portfolio thumbnails are screenshots of the implemented pages, captured by tests/velia-capture.mjs. The source reference images are composition references only.

## Demo behavior and data

Prices and stock are fixed local sample data. VELIA10 applies 10% to products. Standard shipping is 65,000 toman below 1,200,000 and free at/above that threshold; express adds 45,000. Review precedes receipt creation. Stored cart/receipt data uses allowlisted IDs and bounded quantities, with prices reconstructed from the catalog.

No backend, real authentication, payment or shipment. Account activation is a session boolean. Receiver identity and form input never enter storage or network requests. Profile, address and review edits preview only in the current document. Render user text with textContent. Empty, unavailable and unknown-order states give a next action. Native dialogs manage focus; product tabs support RTL arrow keys. Without JS, navigation and product content remain readable and forms cannot submit identity.

## Validation

Run npm run check, npm run build, npm run test:velia, npm run test:velia:motion and npm run test:velia:flow. The flow test measures initial/intermediate/final geometry, rapid retargeting, no-results recovery, cart/drawer deletion, shell continuity and browser back; it also records desktop/mobile videos. Use npm run test:moonex when changing the portfolio shell. Inspect desktop/mobile captures; npm run capture:velia refreshes portfolio images and npm run capture:velia:motion records the normal-motion flows. Rebuild after updating portfolio images. Verification results and limits are recorded in verification-velia.json, verification-velia-motion.json, verification-velia-flow.json and QA_VELIA.fa.md.
