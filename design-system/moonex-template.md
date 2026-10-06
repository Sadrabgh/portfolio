# Moonex reconstruction — Persian / RTL

The chosen reference is https://moonex.ibthemespro.com/home-freelancer. The user's selected direction is Persian and RTL while preserving the reference composition. The source template, rather than the old site's identity or a generic design-system recommendation, sets the visual and motion target. Four independent demo websites remain the portfolio's actual projects.

## Page mapping

- Home / → home-freelancer: centered insignia, three-line Persian introduction with natural wrapping, three-column portrait composition, four counters, five wordmarks, six skill capsules, three-column design approach, infinite project and design-note carousels, five-image strip, dashed circular contact link and compact personal footer.
- /about/ → about-me: large heading, biography, contact and service list opposite the same layered portrait; skills, experience, quote carousel and circular contact link.
- /work/ → works-grid: bold heading, flat category filters, two-column media grid and agency footer.
- /work/{form,luma,orbit,medical}/ → works-showcase: two-line title opposite metadata, large project cover, challenge / solution, a project-specific interface decision, actual desktop and mobile captures, next project and agency footer.
- /services/ → service: title beside four ruled service rows, four ruled approach rows and agency footer.
- /contact/ → contact: bold two-line heading, outlined social icons, information column, seven numbered underline fields and agency footer.
- /privacy/ and /404.html use the internal shell and consistent typography.

## Measured reference geometry

At 1440px with the default 16px root text size: container 1296px (5vw margins), home header 200px, internal header 132px. Persian home heading 68px / 88.4px, top 280px, block height approximately 265px. Portrait 636 × 786px; its 814 × 1006 frame uses the source's separate back, portrait mask and front layers. Six pill columns have 50px gaps and 240px pill heights. Section display headings use Yekan Bakh Regular 52px / 72.8px. Project carousel gap 60px with three 392px cards, measured directly from the live reference. The design approach is content-sized, with no fixed 1016px section height. Circular contact link diameter 480px.

At 390px: container 369px; naturally wrapped home heading 39px / 56.55px. At 320px it uses 32px / 46.4px so the second phrase fits naturally without forced line breaks. Portrait width 369px, height 456px. Internal header is 88px. Skill capsules use three columns (two below 360px). Contact puts the form before secondary information. Other layouts stack independently; the portfolio has one card at small widths, two at medium widths and three on desktop.

RTL mirrors the reference's directional placement. The user's supplied YekanBakhFaNum files now provide the portfolio's single type family: Light 300 for large counters and design notes, Regular 400 for body copy and large display headings, SemiBold 600 for navigation and internal titles, Bold 700 for emphasis, and ExtraBold 800 for the small studio wordmark. Font sizes use rem, with fluid mobile headings; the base body text is 1rem / 1.8. These are static files, so intermediate variable-font weights were mapped to the supplied weights. Local files are bundled and hashed by Vite, use font-display: swap, and preload only Regular and SemiBold. The four independent demo layouts retain their existing font choices. Light tokens: white #fff, black #000, muted #666, soft #f2f2f2, accent #d83824. The reference coral was darkened slightly to pass small-text contrast. Dark mode is optional.

## Motion contract

| Interaction | Measured / implemented timing | Behaviour |
| --- | --- | --- |
| Reference section entrances | 1200ms ease | Pure opacity fade, once, 100ms sibling offsets (max 500ms); no invented upward slide |
| Project and quote carousels | 900ms ease | Manual, infinite, CSS transform, retargetable repeated navigation; no autoplay |
| Card grayscale and metadata | 300ms ease-in-out | Grayscale → colour; muted text → full contrast; keyboard focus equivalent |
| Contact link | 300ms ease-in-out | Accent and 2px upward movement; static wave motif |
| Side panel | 300ms ease-in-out both directions | Native dialog; focus and modality immediate; Escape / backdrop close; focus return |
| Lightbox | 300ms ease-in-out | Native dialog; opacity and proportional .96 → 1 scale; focus return |
| Reference cursor | 44px ring + 8px dot; 52px / 5px on links | Pink translucent trailing ring with a 180ms transform response on its inner layer, immediate dot; fine mouse pointer only; no perpetual frame loop |

Motion is an explicit user requirement. The slower reference timings therefore take precedence over generic fast-interface defaults. No scroll hijacking, automatic carousel playback or background animation loops were added. Carousel touch manipulation tracks the finger directly with native vertical scrolling and zoom retained. Keyboard focus reveals the original slide immediately; overflow:clip prevents browser focus from adding a second scroll offset.

Reduced motion finishes counters, cancels WAAPI entrances, exposes waiting sections, settles the carousel immediately, disables cursor replacement and removes CSS transitions. Content remains visible and all project links remain available without JavaScript.

## Media and content provenance

The portrait, original frame / mask graphics, two faint background ornaments and five moodboard images are local reference assets. Their URLs are documented in public/portfolio/moonex/sources.json. The portrait is explicitly captioned as template demonstration media. Project covers use new tall captures of the actual interfaces, without large photo wordmarks. Case covers pair actual desktop and mobile interfaces. Each case has a distinct detail capture and a concrete explanation of a design decision. The six skill marks are authored vectors with capability labels rather than repeated project counts. Counters describe demonstrable portfolio scope; the quote carousel contains clearly labelled studio design notes. No owner biography, client testimonial, employment record, client logo or skill percentage was invented.

Social links retain the template's generic platform destinations; they do not claim personal profiles. Owner name, contact destinations and the HTTPS form endpoint remain configurable in src/config.ts. With no sending endpoint configured, the contact form generates a downloadable / copyable brief and clearly states it has not been sent. Edits to any field invalidate a previously generated brief.

## Skills and validation

UI UX Pro Max system guidance was used with the selected template as the visual override. The verified targeted ux queries "carousel keyboard focus" and "orphan heading line balance" returned focus and balanced-heading guidance; visible focus, immediate slide reveal and naturally wrapped Persian titles are implemented. UI Animation measurement, gesture and scroll guidance informed interruptibility, motion sensitivity and native scrolling.

ASVS 14.3.3: only appearance preferences are persisted, not contact data. ASVS 1.2.1: search, counters and brief output use textContent. No new external sending destination was configured.

Current refinement checks: npm run check (0 diagnostics), npm run build (42 routes), npm run test:moonex using the installed Chrome (85 passing checks, 11 routes, widths 320/390/768/1440). Persian search spelling variations, the dropdown hover bridge, theme defaults, keyboard switching, persistence and dark contact selects have regression coverage. Selected axe rules on home and contact reported no violations in the earlier refinement; that audit was not repeated for this change. Current skill / theme captures and measurements are under output/playwright/fullstack-theme/; font captures are under output/playwright/yekan-bakh/. Earlier captures are under captures/moonex-refinement/ and captures/moonex-fidelity/. The earlier general demo suite result is historical and was not rerun for this portfolio-only refinement. These verify selected WCAG rules and runtime behaviour; they are not a claim of exhaustive conformance or pixel-perfect equivalence across different scripts and fonts.

## Interaction refinement — 2026-10-04

Search normalizes Persian/Arabic yeh and kaf, diacritics, spaces, zero-width joiners and letter elongation, with explicit Persian aliases for project names. Results remain text nodes and destinations remain fixed allowlisted routes. The dropdown has a continuous hover bridge across the 18px gap and uses transform rather than padding for link movement. A contextual floating back-to-top control appears after the top leaves a 650px observation margin. All added spatial feedback follows the existing reduced-motion rules.

## Full-stack skills and theme selection — 2026-10-04

The owner's stated scope covers all full-stack domains. The shared expertise section now names frontend, backend, API design and integration, databases, testing / debugging, and deployment / infrastructure. Each has an authored vector showing its actual subject: browser, servers, connected endpoints, database, checked terminal, or cloud delivery. No technology brand, proficiency percentage or employment claim is inferred.

On hover, each neutral icon changes to a distinct accent over 200ms ease, with a lightly tinted capsule. Dark mode uses brighter accent variants. Touch and coarse-pointer contexts show the accents immediately; information never depends on hover. Reduced motion removes the transitions.

The compact 44px theme selector appears in the shared header, including mobile, alongside the existing labelled footer control. Light is the first-visit default even when the operating system prefers dark; an explicit saved preference persists across pages and reloads. Both controls update their accessible labels and pressed state together. Theme palette changes suppress transitions for one frame. Contact select fields and native options explicitly use the current surface and text tokens, with inherited color-scheme.

Targeted browser inspection measured all six hover colors in both themes, touch-visible accents, 44px controls and contact layouts at 1440 / 390 / 320px. The native dark dropdown was opened and an option selected successfully in Chrome. Touch checks used browser emulation. The report and screenshots are in output/playwright/fullstack-theme/verification.json and its containing directory.
