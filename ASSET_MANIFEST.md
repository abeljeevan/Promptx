# Prompt X visual asset manifest

This phase supplies modular source imagery and a restrained design system. It deliberately contains no game logic, screen layout, or flattened UI artwork.

## Visual system

| Token | Value | Use |
| --- | --- | --- |
| Background | `#0a0906` | Near-black page frame and deep room shadow |
| Surface | `#211c14` | Secondary panels and dark wood/metal fields |
| Terminal | `#a8d59a` | Muted green terminal copy, outlines, active controls |
| Terminal dim | `#708b68` | Quiet labels, inactive rules, secondary meters |
| Warning | `#9f3029` | Stress states, REC dot, critical controls |
| Paper | `#d8c49c` | Physical documents and evidence surfaces |
| Tungsten | `#c98a45` | Lamp falloff only—do not use as UI accent |
| Hairline | `rgba(168, 213, 154, .55)` | Thin technical border rules |

Use a monospace/typewriter stack such as `"IBM Plex Mono", "Courier Prime", ui-monospace, monospace`. Borders should be 1px, quiet, and occasionally interrupted by short ticks. Keep bloom nearly absent; texture and contrast should provide the age.

## Layer order

1. `environment/interrogation-room-plate.png`
2. `character/suspect-portrait-source.png` (see compositing note)
3. Physical props/evidence in perspective on the desk
4. CSS/HTML surveillance frame and all HUD panels
5. CSS pseudo-elements for scanlines, grain, vignette, and glass glare

Never use the environment plate as a complete interface screenshot. Leave UI controls, borders, copy, meter fill, labels, timestamps, camera number, REC indicator, and state effects in HTML/CSS.

## Delivered assets

| File | Status | What it contains | Copilot implementation note |
| --- | --- | --- | --- |
| `assets/environment/interrogation-room-plate.png` | Ready, 1672×941 | Empty frontal interrogation room: concrete wall, height chart, pendant lamp, left door/camera/red light, right CRT, worn desk | Use with `object-fit: cover`; crop minimally. It is the base environment and reserves central room for the suspect. |
| `assets/character/suspect-portrait-source.png` | Ready, 1536×1024 RGBA | Seated, anxious worker with a low-poly, late-2000s crime-game character treatment; hands clasped by mouth | This has genuine alpha. Position behind the desk edge, centered beneath the lamp. Keep `object-fit: contain`; no feathered matte or blend mode is needed. |
| `assets/character/suspect-photoreal-fallback.png` | Archived fallback, 1536×1024 | Earlier photoreal suspect portrait | Retained only for comparison or a later realism option; do not load by default. |
| `assets/evidence/cctv-corridor-photo.png` | Ready, 1536×1024 | Analog corridor surveillance print | Render as a tilted desk photo with CSS `filter: grayscale(1) contrast(.85) sepia(.12)`, slight shadow, and visible paper border. |
| `assets/evidence/hammer-tool-photo.png` | Ready, 1536×1024 | Aged printed forensic photo of a worn construction hammer | Use as a physical print; never as a shiny gallery image. |
| `assets/evidence/utility-truck-photo.png` | Ready, 1536×1024 | Gritty night utility-truck surveillance print | Keep plate unreadable. Pair with the CCTV asset as a two-photo stack. |

## Planned evidence: CSS/document composition, not generated raster

The remaining evidence is more reliable as HTML/CSS templates with case data injected later. This keeps the case editable and avoids illegible AI-generated small text.

| Desired asset | Location | Build approach |
| --- | --- | --- |
| Phone/location evidence | `assets/evidence/` | Beige paper card, small CSS route polyline, terminal-style call-log rows, a single red location pin. |
| Fingerprint report | `assets/evidence/` | Paper report with CSS/inline-SVG fingerprint mark, evidence stamp, thin ruled table. |
| Witness statement | `assets/evidence/` | Aged paper sheet with selectable/typewritten HTML content and a CSS signature scribble. |
| Evidence folder/paper | `assets/evidence/` | CSS/HTML folder shell in aged cream with a dark-red outlined `EVIDENCE` stamp. |
| Timeline document | `assets/evidence/` | Paper card with CSS vertical rule/ticks and editable timeline entries. |

## Asset folders

- `assets/environment/` — room plates and future architectural layers.
- `assets/character/` — suspect source images; retain originals alongside any future alpha exports.
- `assets/evidence/` — physical photo sources and evidence-document templates.
- `assets/props/` — future independently composited recorder, mug, ashtray, file stack, and loose paper layers.
- `assets/textures/` — optional restrained overlays only; CSS noise/scanlines are preferred initially.
- `assets/surveillance/` — reserved for an optional frame texture. CCTV chrome is CSS, not a raster panel.
- `assets/icons/` — reserved for only icons that CSS cannot express. Use CSS triangles/rules for send, play, and carets first.

Each empty directory contains a scoped handoff note rather than a fake image file.

## CSS/HTML ownership

Build these in the UI, never bake them into an image: all HUD frames and technical side labels, stress meter, buttons, terminal panels, input field, timer, prompt counter, evidence menu, type, progress rules, CCTV overlay, `REC`, camera number, timestamp, scanlines, CRT curvature, static, vignette, and grain.

Suggested effects: use one low-opacity repeating-linear-gradient for scanlines; a subtle animated `opacity` noise layer (or SVG `feTurbulence` if desired); and an inset dark vignette on the CRT only. Do not apply heavy blur, rainbow glitches, blue light, glassmorphism, or neon glow.

## Generation record

Generated with the built-in image workflow, using the supplied reference solely as a visual-direction reference. Prompts emphasized practical tungsten lighting, dark brown/olive institutional materials, analog surveillance, empty compositing space, and avoidance of cyberpunk/modern dashboard styling.

## Suspect expression frames

`SuspectPortrait` crossfades a drawn frame per stress tier. Drop PNGs with these
exact names into `frontend/public/assets/character/` and they are picked up
automatically — no code change. Any tier without a file falls back to
`suspect-portrait-source.png`, graded and moved by the CSS performance layer, so
a partial set is fine and the game never shows a broken image.

| File | Stress | Engine state | Direction |
|---|---|---|---|
| `suspect-calm.png` | 0–20 | CALM | Composed. Hands folded, steady eyes, nothing to hide. |
| `suspect-alert.png` | 21–40 | ALERT | Registering danger. Slight brow tension, more watchful. |
| `suspect-defensive.png` | 41–60 | DEFENSIVE | Guarding. Jaw set, shoulders closing, eye contact breaking. |
| `suspect-pressured.png` | 61–80 | PRESSURED | Losing it. Sweat, flushed, gaze darting off-camera. |
| `suspect-breaking.png` | 81–100 | BREAKING | Gone. Head lowered or hands to face, the composure spent. |

Thresholds mirror `get_stress_state()` in `py.py`; if those change, update
`STRESS_TIERS` in `frontend/src/components/SuspectPortrait.jsx` to match.

**Requirements:** identical framing, camera distance and canvas size across all
five, or the crossfade slides instead of dissolving. Transparent background —
the room plate shows through. Match `suspect-portrait-source.png` dimensions.
