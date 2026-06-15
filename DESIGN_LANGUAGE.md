# Aura Brain — Design Language

The canonical visual spec for Aura Brain, derived from the approved `Aura Brain.dc.html`
mockup. Paste this (or link it) into Claude Code whenever you design or build a new page so
every screen stays in the same family.

**The feeling in one line:** a quiet, book-like devotional tool — Notion-clean structure
rendered in an all-serif type system, on warm paper, with faith present but understated.
Mobile-first for iPhone, calm enough that nothing shouts.

---

## 1. Principles

- **Quiet over loud.** No bright fills, no hard shadows, no saturated UI chrome. Color is
  used sparingly as *meaning* (sage = done/affirmed, clay = attention/priority), never as
  decoration.
- **All serif, always.** Two serif families do all the work — there is no sans-serif anywhere
  in the product UI. This is what makes it feel like a book, not an app.
- **Warm paper, not white.** Backgrounds are warm off-whites and bone tones, never pure
  `#FFFFFF` except inside elevated cards. Dark mode is "warm ink" (warm charcoals), never
  flat black.
- **Hairlines and tonal bands do the separating.** Sections are divided by 1px warm rules and
  subtly different background tints, not by heavy borders or big drop shadows.
- **Metadata whispers.** Priority, cadence, counts, and timestamps render small, uppercase,
  letter-spaced, and muted — they inform without competing with names and content.
- **Inbox-zero calm.** Empty / cleared states are a feature. End-of-list lines like
  *"When the queue is clear, rest."* are italic Newsreader in a faint tone.

---

## 2. Color tokens

Implement as CSS custom properties on a root class (`.aura-root`), with dark values under
`.aura-root.theme-dark`. **Never hardcode hex in components — always reference the token.**
The one deliberate exception: white (`#fff`) checkmark *strokes* stay white in both themes;
only white *backgrounds* darken.

### Light theme

```css
.aura-root {
  /* surfaces */
  --card:         #FFFFFF;  /* elevated cards only */
  --canvas:       #E8E6E0;  /* page background behind everything */
  --screen:       #FAF8F3;  /* the phone "paper" / app background */
  --canvas-card:  #FCFBF8;  /* nested/inset card on canvas */
  --band:         #F4F0E8;  /* tonal band (habit banner) */
  --toggle-track: #EFEAE0;  /* segmented-control track */
  --avatar:       #ECE7DB;  /* person/group avatar fill */
  --avatar-2:     #EFEADF;  /* secondary avatar fill */
  --req-avatar:   #EDEFEA;  /* standalone-request avatar fill (greenish) */
  --sage-tint:    #EEF3EC;  /* affirmed / done background wash */
  --clay-tint:    #FBF4E9;  /* attention / priority background wash */
  --track:        #ECE6DA;  /* progress-bar track */
  --track-2:      #EFE9DD;  /* secondary progress track */
  --dots-empty:   #D7CFBF;  /* empty streak dot */

  /* borders & rules */
  --border:        #EBE6DC;
  --border-2:      #E6DFD2;
  --band-border:   #EAE3D6;
  --divider:       #F1ECE2;
  --border-a:      #DCD6CA;
  --border-b:      #E2DCD0;
  --border-c:      #E6E0D5;
  --divider-b:     #F0EBE1;
  --timeline:      #E6E0D4;  /* vertical timeline line */
  --rule:          #D6D0C4;  /* the strongest hairline (section rule) */
  --avatar-border: #DDD6C8;
  --clay-border:   #E2D3BE;
  --sage-border:   #CADBCB;
  --checkbox-border:#D2CBBC;
  --dashed:        #C3BCAD;  /* dashed "add" affordances */

  /* text (warm near-blacks → faints) */
  --ink-display: #1F1D18;  /* display headings (Newsreader) */
  --ink:         #26241F;  /* primary text */
  --body:        #3A372F;  /* long-form body / log entries */
  --secondary:   #6F6A60;  /* supporting text */
  --muted:       #9A958A;  /* labels, metadata */
  --faint:       #A39E92;
  --faint-2:     #B0AB9E;
  --faint-3:     #B6B0A2;  /* "rest" line */

  /* accents */
  --clay:           #A8845C;  /* warm tan — attention, priority, primary action */
  --sage:           #5F7F67;  /* muted green — done, affirmed, calm */
  --sage-text:      #3E5A45;  /* sage as readable text color */
  --clay-underline: #D8B98E;  /* dotted underline on detected person */
  --sage-underline: #A9C3AE;  /* dotted underline on detected group */

  /* shadows — barely-there, warm-tinted */
  --shadow-sm:   rgba(40,36,31,0.03);
  --shadow-md:   rgba(40,36,31,0.07);
  --shadow-clay: rgba(168,132,92,0.25);  /* glow under primary button */
}
```

### Dark theme ("warm ink")

```css
.aura-root.theme-dark {
  --card:         #221F1B;
  --canvas:       #100F12;
  --screen:       #171511;
  --canvas-card:  #1B1A20;
  --band:         #1E1B16;
  --toggle-track: #24221C;
  --avatar:       #2C2820;
  --avatar-2:     #2A2620;
  --req-avatar:   #1E2A22;
  --sage-tint:    #1B2620;
  --clay-tint:    #2A2017;
  --track:        #2A261E;
  --track-2:      #2A261E;
  --dots-empty:   #3C3730;

  --border:        #322E27;
  --border-2:      #302C25;
  --band-border:   #2A2620;
  --divider:       #272320;
  --border-a:      #322E27;
  --border-b:      #322E27;
  --border-c:      #302C25;
  --divider-b:     #272320;
  --timeline:      #302C25;
  --rule:          #2C2922;
  --avatar-border: #3A352C;
  --clay-border:   #4A3D2B;
  --sage-border:   #33473A;
  --checkbox-border:#46413A;
  --dashed:        #544E45;

  --ink-display: #F1EDE5;
  --ink:         #ECE7DD;
  --body:        #D6D1C6;
  --secondary:   #A39C8E;
  --muted:       #827C70;
  --faint:       #6E685D;
  --faint-2:     #6E685D;
  --faint-3:     #6A645A;

  --clay:           #C49A6C;  /* brightened to hold contrast on dark */
  --sage:           #80A789;  /* brightened */
  --sage-text:      #A7C9AD;
  --clay-underline: #8A6A44;
  --sage-underline: #5E7A64;

  --shadow-sm:   rgba(0,0,0,0.32);
  --shadow-md:   rgba(0,0,0,0.5);
  --shadow-clay: rgba(196,154,108,0.35);
}
```

**The four-swatch summary palette** (what the design self-documents as): `paper` (`--screen`),
`ink`, `sage`, `clay`.

### Theme switching gotcha (learned the hard way)
Do **not** put a CSS `transition` on a property whose value is a bare `var()` on the element
that owns the theme class — some engines won't re-resolve the variable when only the variable
changes, so the root background stays frozen while descendants flip. Flip the class instantly
(no transition on `background`/`color` of `.aura-root`), or cross-fade an overlay instead.
Persist the choice (e.g. `localStorage 'aura-theme'`); default to light.

---

## 3. Typography

Two Google fonts, both serif. **No sans-serif in the product UI** (the iOS status bar / system
chrome is the only place `-apple-system` appears, and that's the device frame, not the app).

```html
<link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&display=swap" rel="stylesheet">
```

- **Newsreader** — display & titles. Page titles ("Today", "New entry"), names, card titles,
  section numbers, streak numbers, tab labels, and *italic* quiet lines. Weights 400/500;
  italic 400/500. Set with tight tracking on big sizes (`letter-spacing:-0.5px`) and generous
  line-height (`1.05–1.15`).
- **Source Serif 4** — body & interface. Paragraphs, journal entry text, log entries,
  metadata, descriptions, buttons-as-text. Weights 400/500/600.

Fallback stack for both: `Georgia, serif`.

### Type scale (px, mobile)

| Role | Family | Size / weight | Notes |
|---|---|---|---|
| Hero display | Newsreader 400 | 46 / line 1.08 / `-0.5px` | landing only; italic span for emphasis |
| Page title | Newsreader 400 | 32–34 / line 1.05 | "Today", "New entry" |
| Person name (detail) | Newsreader 400 | 29 | profile header |
| Section heading | Newsreader 500 | 27 | numbered sections (web), `white-space:nowrap` |
| Group / card title | Newsreader 500 | 16–17 | inside cards |
| Annotation heading | Newsreader 400 | 19 | "How it holds together" |
| Streak number | Newsreader 400 | 18 | unit "d" small + muted |
| Body / journal | Source Serif 4 400 | 16 / line 1.65 | the writing surface |
| Log entry | Source Serif 4 400 | 14.5 / line 1.5 | relational log |
| Supporting text | Source Serif 4 400 | 13–15 / line 1.5 | descriptions, subs |
| Eyebrow label | Source Serif 4 600 | 10–11 / `letter-spacing 1.4–1.8px` / UPPERCASE | "DAILY RHYTHM", "THE QUEUE" |
| Metadata | Source Serif 4 600 | 11 / `0.3px` / often UPPERCASE | priority, cadence, counts |

**Idiom:** every all-caps eyebrow label is `--muted`, 10–11px, `font-weight:600`,
`letter-spacing 1.4–1.8px`, `text-transform:uppercase`. Use it for every section header
inside a screen.

---

## 4. Layout, spacing, radii

- **Mobile-first.** Design at iPhone width (the mockup frames content at **402 × 874**).
  Phone "paper" background is `--screen`; the page behind it is `--canvas`.
- **Screen padding:** header blocks pad `56px 22px ~16px` (the 56px top clears the dynamic
  island/status bar). Content sections pad `0 16px`. Cards pad `11–17px`.
- **Vertical rhythm:** gap `9px` between queue cards; `8px` between chips; `16–24px` between
  sections.
- **Radii (the warm, soft-but-not-pill family):**
  - Cards / panels: **18–20px**
  - Phone-screen demo frames: **26px**
  - Small inner cards & chips: **13px**
  - Avatars (person): **999px** (full circle)
  - Avatars (group): **11–15px** rounded square
  - Avatars (standalone request): **11px** rounded square
  - Pills / tags / segmented tracks: **999px**
  - Primary button: **15px**
  - Checkboxes: **999px** (round)
- **Elevation:** almost none. Cards use `box-shadow:0 1px 2px var(--shadow-sm)`. The only
  larger shadow is on demo phone frames (`0 12px 30px var(--shadow-md)`) and a soft clay glow
  under the primary button (`0 2px 6px var(--shadow-clay)`).
- **Borders:** 1px, always a `--border*` token. Tonal bands additionally get top+bottom
  `--band-border` hairlines to separate without boxing.

---

## 5. The accent system (this is the soul of it)

Two accents, each with a fixed meaning. Stay disciplined — don't introduce new colors.

- **Sage** (`--sage`) = **done / affirmed / calm / from-the-system.** Checked checkboxes fill
  sage with a white check. Completed habit chips get `--sage-tint` bg + `--sage-border`.
  Progress fill is sage. The "FROM JOURNAL" tag, confirmed AI suggestions, the "check off the
  whole group" button, and the saved-confirmation icon are all sage.
- **Clay** (`--clay`) = **attention / priority / time-boxed / primary action.** "HIGH" priority
  pills, the temporary-challenge progress bar, the recognized-person dotted underline, the
  primary "Save & route" button, and "tap to…" hint phrases in section intros are clay.
- **Priority → color mapping** (queue cards): `High → clay`, `Group → sage`,
  `Medium → secondary`, `Low → muted`.
- **Entity → avatar shape mapping**: `person → circle (--avatar-2)`,
  `group → rounded square 11px (--avatar)`, `standalone request → rounded square 11px
  (--req-avatar), text in sage`.

---

## 6. Component patterns

Reference these so new screens reuse the exact same parts.

**Checkbox.** Round, `1.5px solid --checkbox-border` when empty; when done, no border, fill
`--sage`, white SVG check (`stroke="#fff"`, `stroke-width 2.6–3`, path
`M5 12.5l4.2 4.2L19 7`). Sizes: 24 (queue/group), 22 (requests), 20 (members), 18 (habit chip).
`transition:all .15s`.

**Card.** `background:--card; border:1px solid --border; border-radius:18–20px;
box-shadow:0 1px 2px --shadow-sm`. Internal rows separated by `1px solid --divider`.

**Queue card (row).** `[checkbox] [avatar 40px] [title + sub + meta] [chevron ›]`. Title is
Newsreader 17/500; sub is Source Serif 12.5 `--secondary`; meta row is small Source Serif:
`PRIORITY · every N days · N requests`. On done: title goes `--muted` + `line-through`, the
avatar/sub/meta drop to `opacity:.5`.

**Pill / tag.** `border-radius:999px; padding:5px 11px; 1px border`. Priority pill =
clay text + `--clay-border` + `--clay-tint`. Neutral pill = `--secondary` + `--border-b` +
`--card`.

**Tonal band (habit banner).** Full-bleed strip in `--band` with top+bottom `--band-border`
hairlines. Eyebrow label + a right-aligned `n / n` count, then a `flex-wrap` row of habit chips.

**Habit chip.** `inline-flex`, `border-radius:13px`, `padding:7px 11px 7px 8px`:
`[18px round check] [Newsreader 14 name] [streak "42d"]`. Done → `--sage-tint` bg,
`--sage-border`, name `--sage-text`, streak `--sage`. Undone → `--card`, `--border-c`,
streak `--clay`.

**Streak trail (variant).** A row of seven 7px dots, `--sage` for hit days, `--dots-empty`
for missed, plus a big Newsreader streak number with a small Source-Serif " d".

**Progress bar.** `height:5px; border-radius:999px; background:--track`; fill is
`--sage` (queue) or `--clay` (time-boxed challenge), also `border-radius:999px`,
`transition:width .3s`.

**Segmented toggle.** Track `--toggle-track`, `border-radius:13px` (or 999px for the
theme/global toggle), `padding:4px`. Active tab: `--card` bg, `--ink` text, `1px --border-2`,
`box-shadow:0 1px 2px --shadow-md`. Inactive: transparent, `--muted` text. Label is
Newsreader.

**Relational log / timeline.** Left rail = a 9px dot (`--sage` for the most recent / from-journal
entry, else `--dots-empty`) over a 1px `--timeline` line. Each entry: `Mon D` date in `--muted`
12px, an optional `FROM JOURNAL` sage tag, then Source Serif 14.5 `--body` text. Append-only,
newest on top.

**"FROM JOURNAL" tag.** `font-size:10; font-weight:600; color:--sage; background:--sage-tint;
border-radius:999px; padding:2px 8px; letter-spacing:0.3px;` uppercase.

**Add affordance.** A dashed round `+` (`1.5px dashed --checkbox-border`, `+` in `--dashed`)
next to an *italic Newsreader* prompt like "Add a request".

**Primary button.** Full-width, `--clay` fill, white Newsreader 16 text, `border-radius:15px`,
`padding:14px`, `box-shadow:0 2px 6px --shadow-clay`. Followed by a tiny italic Newsreader
reassurance line in `--faint` (e.g. *"Nothing reaches a profile without your nod."*).

**Recognized-entity underline (journal).** Inline text gets `border-bottom:1.5px dotted`:
person → `--clay-underline` with `--clay` text; group → `--sage-underline` with `--sage-text`.

**Blinking caret.** `@keyframes auraCaret { 0%,49%{opacity:1} 50%,100%{opacity:0} }` on a 2px
× 17px `--clay` bar, `animation:auraCaret 1.1s steps(1) infinite`.

**Device frame (mockup only).** Screens are shown inside a 402×874 iOS frame (radius 48,
dynamic island, status bar, home indicator) from `ios-frame.jsx`. The frame is presentation
scaffolding — production renders the screen content full-bleed in the PWA, not the bezel.

---

## 7. Voice & microcopy

The words are part of the design. Keep them quiet, warm, faith-rooted but understated, and
never pushy.

- Reassure, don't nag: *"Nothing reaches a profile without your nod."*,
  *"all 12 resurface in 48 hours."*
- Bless the empty state: *"When the queue is clear, rest."*
- Name the system gently: the AI is **"Aura"** and it *"noticed"* / *"recognizes"* — it offers,
  you confirm. Never "AI detected" or "algorithm".
- Faith vocabulary is present but soft: "pray as one body", "Brother in Christ", "answered" —
  woven into content, not chrome.
- Metadata phrasing: "HIGH · every 3 days", "Last prayed 2 days ago", "3 of 10 cleared",
  "18/28".

---

## 8. Quick checklist for any new page

1. Wrap in `.aura-root` (+ `theme-dark` when dark); background `--screen`, page `--canvas`.
2. All text is Newsreader (display/titles) or Source Serif 4 (body/UI) — **zero sans-serif**.
3. Header pads `56px 22px 16px`; eyebrow labels uppercase/muted/letter-spaced.
4. Cards: `--card`, `1px --border`, radius 18–20, `shadow-sm` only.
5. Sage = done/affirmed; clay = attention/priority/primary action. Nothing else colored.
6. Avatars: circle=person, rounded-square=group/request.
7. Soft warm tones only — no pure white surfaces in light, no flat black in dark.
8. End with a quiet, reassuring line where a page can "rest".
