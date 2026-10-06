# Atelier No — forest architecture

## Direction
The user's architecture reference supplies the forest palette, oversized white headings, framed image-led hero, alternating project tiles, four-cell approach grid, quiet image break and category-led project feature. The existing ATELIER NO identity and Persian reading direction remain independent. All copy belongs to this conceptual studio.

The ui-ux-pro-max search for architecture/forest/green matched Exaggerated Minimalism and Portfolio Grid. Those layout principles fit the reference. Its black/gold palette and Latin font suggestions were not adopted: the supplied green reference and the existing local Vazirmatn font are the source of truth. Astro guidance is applied only where compatible with the repository's installed Astro 5.

## Visual tokens
- Forest canvas: #1b291f; panel: #344437; deeper theme: #142017 / #29392d.
- Warm white: #f4f4eb; secondary text: #c1cbbd; line: #596857.
- Pale green focus: #e6ef9d. Keep contrasting outlines on interactive elements.
- Local Vazirmatn; headlines 700–800, body 400. Persian headings use balanced lines.
- Square images and tiled project grids; pill CTAs and a circular menu trigger.
- Frame gutter 12px on mobile, 24–72px on desktop. Large layouts retain a single DOM reading order.

## Motion contract
- Hero video follows native scroll linearly in both directions. No easing, wheel interception, autoplay or artificial scroll inertia.
- Full sequence occupies 2.6 viewport heights on desktop and 2.4 on mobile. User can continue or use the project/archive links.
- H.264 video has a keyframe every six source frames and no B-frames. Use the 768px file on mobile and the 1280px source on desktop.
- Poster remains available before decoding, on media failure, without JavaScript and under reduced motion. Reduced motion avoids fetching the video.
- Decode only the latest requested time; skip work while the document or story is inactive. Seek completion may service one newer target.
- Marketing reveals: 700ms, once, only selected headings/sections. Project browsing and inquiry controls remain immediately usable.
- Tabs: 180ms opacity. Native dialog: existing paired 240ms opening / 160ms closing. Hover image scale only on fine pointers.

## Content and routes
Keep the existing archive, three original stories, studio, services and demo inquiry. Add Grove House from the user's video as a fourth conceptual study. It has a gallery and spatial diagram; do not label an unrelated existing 3D model as this new house. Portfolio routes and IDs remain compatible.
Approach numbers describe the actual four studies, three uses, three process steps and two visual angles. They do not imply real commissions, awards or business history.

## Validation scope
Basic Astro diagnostics/build and browser checks: forward/reverse seeking, smaller mobile source, menu, category selection, archive filter, gallery, demo inquiry, reduced motion and static fallback. Capture the actual interface for portfolio previews. No exhaustive performance audit requested.
