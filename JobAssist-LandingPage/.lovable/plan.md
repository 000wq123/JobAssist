## What changes

Two things:
1. **Remove zoom.** The mouse-wheel zoom on the globe goes away; drag-to-rotate stays.
2. **Re-stage the hero like Reflect.** Drop the 2-column layout. Stack everything center-aligned: pill badge → headline → subhead → CTA → globe rising from below the text, with a violet eclipse glow as its horizon and the dashboard mockup peeking up into the bottom of the glow.

## Brainstorm — how Reflect pulls off that visual

Reflect's hero isn't a full sphere. It's an **eclipse**: you see the top arc of a dark planet, a thin bright rim around it, a fat radial halo blooming downward, and the product UI overlapping the lower edge so the planet looks like it's setting behind the app. Layered, that's roughly:

```text
   • • •  faint constellation dots / orbit arcs
        ╭──────╮              ← thin bright rim (Fresnel ring)
       ╱  dark  ╲             ← dark sphere top half
      ╱  planet  ╲
     ╱            ╲
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓          ← bright violet bloom across horizon
  ░░░ dashboard card ░░░       ← product UI overlaps the glow
```

Our version keeps it as a **real 3D globe** (not a flat black hole), but borrows the staging:

- Globe centered under the headline, slightly oversized, positioned so its **bottom third sits behind the dashboard card** below.
- A **violet horizon bloom** (radial gradient + blur) sits behind+below the globe, brightest at the equator-line, fading up and out.
- A **thin Fresnel rim** on the sphere itself (we already have one — turn it up).
- **Concentric dotted arc rings** drawn in SVG behind the globe to suggest orbits / "satellite constellation" — same dotted vibe as Reflect's faint dots.
- A few **floating pinpoint dots** scattered above the glow line (like Reflect's stars).
- The dashboard `MatchInterface` lifts up into the hero so it overlaps the lower glow — visually tying "planet" to "product."

## Layout plan (top → bottom of hero)

1. Floating nav (unchanged).
2. Small pill badge: "✨ KV-geprüft · neu für Österreich".
3. Centered H1 (`JobAssist: Dein Weg in den Job.`) — wider, since no right column.
4. Centered subhead (max ~560px).
5. Primary CTA "Kostenlos starten" + ghost link "Wie funktioniert's? ↓".
6. Spacer.
7. **Stage:** globe + bloom + orbit rings + star dots.
8. Dashboard `MatchInterface` mockup pulled up with negative margin so its top edge overlaps the bottom of the bloom.

The Journey 3-step section and everything below stay as-is.

## Technical notes

- `src/components/EarthGlobe.tsx`: delete the `wheel` listener + `onWheel` handler. Keep drag + momentum + auto-spin.
- `src/routes/index.tsx` `Hero`: switch the grid to a single centered column. Add the bloom layer (radial-gradient div, blurred), the orbit-ring SVG (2–3 concentric dashed circles, low opacity), and the star-dot layer (small absolutely-positioned spans with subtle pulse).
- The circular mask wrapper around the globe stays so zoom artifacts can't reappear from any future transform.
- Pull `MatchInterface` (or a slimmer hero variant of it) into the bottom of the hero with `-mt-24` or similar, behind/above the bloom via `z-index`.
- All colors stay in the existing violet palette (`#A78BFA` / `#8B5CF6` / `#C4B5FD`). No new tokens needed.

## Out of scope for this pass

- Real product screenshots in the dashboard mockup (still the current static UI).
- Parallax/scroll-tied animation of the globe (can add later if you want it more "alive").
- Mobile-specific re-staging beyond standard responsive scaling.

## One thing to confirm before I build

Reflect's eclipse hides the bottom half of the planet behind the bloom + dashboard. Do you want:
- **(A) Full visible globe**, with bloom around it and dashboard below (cleaner, more "product-y"), or
- **(B) True eclipse staging**, globe's bottom third tucked behind the bloom + dashboard, more dramatic and closer to Reflect.

I'll default to **(B)** unless you say otherwise — it's the move that makes the page feel like Reflect.