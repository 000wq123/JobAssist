# Landing Page Design Prompt

Use this prompt in **V0.dev**, **Framer AI**, **Relume**, or any design generation tool to create the JobAssist landing page.

---

## The Prompt

```
Design a landing page for "JobAssist" — an AI-powered job application assistant built by a 16-year-old in Vienna, Austria, for other Austrian teens (ages 16–19) looking for their very first job.

### Brand Identity
- Logo: A rounded purple square (#6152F3) with a white sparkle/star icon inside, followed by the text "JobAssist" in Inter semibold
- Colors: Near-black background (#07070A), white text, electric violet (#6152F3) accent, emerald green (#34D399) for success states
- Font: Inter (sans-serif), tight tracking, bold headings

### Target audience
Austrian teenagers who have NEVER had a job before. They're looking for:
- Lehrstelle (apprenticeship)
- Praktikum (internship)
- Ferialjob (summer job)
- Samstagsjob (Saturday job)

They don't know how to write a CV. They don't know what a cover letter should say. They're nervous.

### Tone of voice (CRITICAL)
- Talk like a helpful older friend, NOT like a corporation
- Use "du" (informal German), never "Sie"
- Be direct, warm, slightly casual
- NO buzzwords: don't say "KI-gestützt", "DSGVO-konform", "ATS-optimiert" in hero copy
- NO marketing clichés: don't say "revolutionär", "game-changer", "nächstes Level"
- NO bullet-point checklists that read like compliance documents

### GOOD copy examples:
- "Du willst arbeiten. Wir helfen dir rein."
- "Lebenslauf bauen, Bewerbung schreiben, Job finden — alles an einem Ort."
- "Dauert 5 Minuten. Kein Abo."
- "Probier's einfach aus."
- "JobAssist ist von einem 16-Jährigen aus Wien gebaut, der selber keinen Plan hatte, wie man sich bewirbt."

### BAD copy examples (avoid these):
- "Kein Spam, keine Dark Patterns, kein Abo-Zwang" ← robotic checklist
- "DSGVO-konform, Server in der EU" ← compliance language, not teen language
- "KI-Bewerbungen für den österreichischen Arbeitsmarkt" ← sounds like a press release
- "Einfache Preise. Keine Überraschungen." ← generic SaaS cliché

### What the app actually does (features):
1. **CV Builder** — A 6-step wizard that guides teens through creating their first resume. Asks about school, interests, skills. Pre-fills suggestions relevant to teens (babysitting, tutoring, retail, etc.)
2. **AI Cover Letter Generator** — Paste a job listing, get a personalized cover letter back in 30 seconds
3. **Job Search** — Aggregates Lehrstellen, Praktika, Ferialjobs across Austria. Filter by region, industry, type
4. **Interview Coach** — Practice job interviews with AI. It asks questions, you answer, it gives feedback
5. **Application Tracker** — Keep track of where you applied and what happened

### Pricing:
- Gratis (€0 forever): CV builder, 5 cover letters/month, job search, tracker
- Pro (€4.99/month): 25 cover letters, interview coach, CV feedback
- Max (€7.99/month): Everything unlimited

### Design requirements:
- Dark theme (true black/near-black)
- 3D floating elements or high-quality illustrations in the hero — NOT flat icons
- Show the actual product in action (CV wizard, cover letter generation)
- Asymmetric layouts — NOT the typical centered-hero + 3-column-cards template
- White primary CTA buttons (not purple — every AI page uses purple buttons)
- Left-aligned hero text
- NO generic Lucide/Heroicons as feature icons — use actual product screenshots or 3D renders
- The hero should make you feel something, not just inform you
- Mobile-first thinking

### Page sections (in order):
1. Sticky navbar (logo left, "Einloggen" + "Registrieren" right)
2. Hero (left text, right 3D visual showing the app)
3. "So funktioniert's" — 3 conversational steps (not numbered cards, more like a story)
4. "Über uns" — a single honest paragraph about the founder (not a bullet grid)
5. Pricing — 3 tiers, minimal, left-aligned header
6. Final CTA — "Probier's einfach aus." with one button
7. Footer — logo, links (Produkt, Rechtliches, Info)

### What makes this NOT AI slop:
- No centered hero with purple gradient
- No symmetric 3-column feature cards with generic icons
- No "trusted by" logos (we don't have enterprise clients — we have teens)
- No vanity metrics ("12,000+ users")
- No testimonial cards with fake avatars
- The 3D hero visual should be UNIQUE — show actual app UI floating with depth, glassmorphism, perspective transforms
- Copy reads like it was written by a person, not generated
```

---

## Recommended tools to use this prompt:

| Tool | Best for | Output |
|------|----------|--------|
| **V0.dev** (Vercel) | Direct React + Tailwind code | Copy-paste into your existing codebase |
| **Framer** | Full hosted page with animations | Deploy as standalone or export |
| **Relume** | Wireframe/sitemap → Figma | Export to Figma, then build |
| **Figma + AI plugins** | Visual design iteration | Design file for reference |
| **Lovable.dev** | Full-stack prototype | Hosted prototype |

## Tech constraints (if using V0 or code-based tools):
- React 19 + Tailwind v4 + Vite
- 12-column CSS Grid for layout
- No `position: absolute` for layout blocks
- Functional components with JSDoc
- CSS custom properties for colors (see `index.css` @theme block)
