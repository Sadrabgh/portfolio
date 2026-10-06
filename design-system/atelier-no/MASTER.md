# Atelier No — forest architecture

## Direction
The user's architecture reference supplies the forest palette, oversized white headings, full-viewport image-led hero, alternating project tiles, four-cell approach grid, quiet image break and category-led project feature. The existing ATELIER NO identity and Persian reading direction remain independent. All copy belongs to this conceptual studio.

The ui-ux-pro-max search for architecture/forest/green matched Exaggerated Minimalism and Portfolio Grid. Those layout principles fit the reference. Its black/gold palette and Latin font suggestions were not adopted: the supplied green reference and the existing local Vazirmatn font are the source of truth. Astro guidance is applied only where compatible with the repository's installed Astro 5.

## Visual tokens
- Forest canvas: #1b291f; panel: #344437; deeper theme: #142017 / #29392d.
- Warm white: #f4f4eb; secondary text: #c1cbbd; line: #596857.
- Pale green focus: #e6ef9d. Keep contrasting outlines on interactive elements.
- Local Vazirmatn; headlines 700–800, body 400. Persian headings use balanced lines.
- Square images and tiled project grids; pill CTAs and a circular menu trigger.
- Hero has no outer gutter, starts at y=0 and is exactly 100dvh high, without a minimum pixel height. Header and portfolio return link overlay it. Other sections retain 12px mobile and 24–72px desktop gutters. The user prioritizes full-screen coverage: cover at 52% horizontal focus trims the landscape source on portrait screens; showing the entire source without empty space requires a portrait source.

## Motion contract
- Hero video follows native scroll linearly in both directions. No easing, wheel interception, autoplay or artificial scroll inertia.
- Full sequence occupies 2.6 viewport heights on desktop and 2.4 on mobile. User can continue or use the project/archive links.
- Render the original five-second, 24fps clip as 120 independently addressable WebP images per variant. Desktop is 1280px / 6.4 MB compressed; mobile is 768px / 3.3 MB. This removes repeated asynchronous video seeks; it does not reduce total transfer size. H.264 exports remain unused historical assets.
- Poster remains available before decoding, on failure, without JavaScript and under reduced motion. Reduced motion avoids fetching both the sequence and video.
- Retain compressed frames for quick reversal, but hold at most ten decoded ImageBitmaps (plus two in-flight decodes). Prefetch coarse coverage and the nearest frames with four concurrent requests. Stop requests and release decoded surfaces off-screen/when hidden; close bitmaps and abort requests when reduced motion is enabled. Measure scene geometry only on resize or state changes. Native scroll maps directly to frame index without easing.
- Marketing reveals: 700ms, once, only selected headings/sections. Project browsing and inquiry controls remain immediately usable.
- Tabs: 180ms opacity. Native dialog: existing paired 240ms opening / 160ms closing. Hover image scale only on fine pointers.

## Content and routes
Keep the existing archive, three original stories, studio, services and demo inquiry. Add Grove House from the user's video as a fourth conceptual study. It has a gallery and spatial diagram; do not label an unrelated existing 3D model as this new house. Portfolio routes and IDs remain compatible.
Approach numbers describe the actual four studies, three uses, three process steps and two visual angles. They do not imply real commissions, awards or business history.

## Validation scope
Basic Astro diagnostics/build and browser checks: forward/reverse painted frames, smaller mobile images, edge-to-edge viewport geometry at desktop/mobile/short heights, menu, category selection, archive filter, gallery, demo inquiry, reduced motion and static fallback. Capture the actual interface for portfolio previews. No exhaustive performance audit requested.
