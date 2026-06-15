# Claude Design — New Page Prompt (Aura Brain)

Use this when you open **Claude Design** (claude.ai/design) to mock up a *new* Aura Brain
screen and want it to land in the same visual language as the approved `Aura Brain.dc.html`.

How to use it: copy the block below the line, then replace the **`▶ THE SCREEN`** section at
the top with what you actually want designed. Leave the design-system section intact — that's
what keeps every new screen on-brand. (For the full token reference, see `DESIGN_LANGUAGE.md`.)

---

You are designing a new screen for **Aura Brain**, a mobile-first iPhone PWA. It is a quiet,
book-like "second brain" — a load-balancing prayer & relationship CRM, habit tracker, and
journal. The whole product feels like a **devotional book, not an app**: Notion-clean
structure rendered in an **all-serif** type system, on **warm paper**, with faith present but
understated. Nothing shouts.

Mock it up in HTML/CSS/JS inside the shared `IOSDevice` frame (402 × 874), matching the
existing sections exactly. Show it in both **light and dark** via the `.theme-dark` class on
the root. Keep it mostly visual with a few real interactions (check something off, toggle,
expand).

## ▶ THE SCREEN  — *(replace this section)*

> **Page:** _e.g. "Network — the full directory of People, Groups, and standalone Requests."_
> **Purpose:** _what the user does here._
> **Key elements:** _list the sections / cards / controls you want._
> **Interactions:** _what should be tappable / live._
> **Empty / resting state:** _what it says when there's nothing to do._

## Non-negotiable design system — match the existing screens

**Type — all serif, no sans-serif anywhere in the UI.**
- `Newsreader` (Google) for display & titles, names, card titles, tab labels, streak numbers,
  and italic quiet lines. Weights 400/500.
- `Source Serif 4` (Google) for body, journal text, log entries, metadata, descriptions,
  buttons-as-text. Weights 400/500/600.
- Fallback `Georgia, serif`. Page titles ~32px Newsreader; body 16px Source Serif line-height
  1.65; eyebrow labels 10–11px Source Serif 600, UPPERCASE, letter-spacing 1.4–1.8px, `--muted`.

**Color — use CSS variables, never raw hex. Light values, dark under `.theme-dark`:**
- Surfaces: page `--canvas #E8E6E0`; app paper `--screen #FAF8F3`; cards `--card #FFFFFF`;
  tonal band `--band #F4F0E8`. Dark = "warm ink": `--canvas #100F12`, `--screen #171511`,
  `--card #221F1B`. **No pure-white surfaces in light, no flat black in dark.**
- Text: `--ink-display #1F1D18`, `--ink #26241F`, `--body #3A372F`, `--secondary #6F6A60`,
  `--muted #9A958A`, `--faint #A39E92`.
- Borders/rules are warm bone tones (`--border #EBE6DC`, `--rule #D6D0C4`, `--divider #F1ECE2`).
- **Two accents, fixed meanings — introduce no others:**
  - **Sage `--sage #5F7F67`** = done / affirmed / calm / from-the-system. Checked boxes fill
    sage w/ white check; done backgrounds use `--sage-tint #EEF3EC`; progress fill, the
    "FROM JOURNAL" tag, and confirmed AI suggestions are sage.
  - **Clay `--clay #A8845C`** = attention / priority / time-boxed / primary action. HIGH pills,
    challenge progress bars, the primary button, recognized-person underline, and "tap to…"
    hints are clay.
  - Priority→color: High=clay, Group=sage, Medium=secondary, Low=muted.

**Shape & elevation.**
- Radii: cards 18–20px; inner cards/chips 13px; primary button 15px; pills/tracks 999px;
  person avatars full circles; group & standalone-request avatars rounded squares (11–15px).
- Almost no shadow: cards `0 1px 2px var(--shadow-sm)`. Soft clay glow under the primary button
  only. Separate sections with 1px warm hairlines and tonal background bands, not heavy borders.

**Reusable parts (match exactly):**
- *Eyebrow label* (uppercase muted letter-spaced) heads every section inside a screen.
- *Card row*: `[round checkbox] [avatar 40px] [Newsreader title + Source-Serif sub + small meta]
  [faint › chevron]`; done state → muted strikethrough title + 0.5 opacity on avatar/sub/meta.
- *Pill/tag*: 999px, 1px border, 5×11 padding. *Segmented toggle*: `--toggle-track`, active tab
  = `--card` + subtle shadow + Newsreader label.
- *Progress bar*: 5px, 999px, sage (or clay for time-boxed). *Streak chip / 7-dot trail* per the
  habit banner. *Timeline log*: left dot+line rail, `Mon D` muted date, optional sage
  "FROM JOURNAL" tag, Source-Serif 14.5 body, append-only newest-first.
- *Primary button*: full-width clay fill, white Newsreader 16, radius 15, soft clay glow, with a
  tiny italic Newsreader reassurance line beneath.
- *Add affordance*: dashed round `+` beside an italic Newsreader prompt.

**Voice.** Warm, quiet, faith-rooted but understated, never nagging. The AI is named **"Aura"**
and it *"notices" / "recognizes"* — it offers, the user confirms ("Nothing reaches a profile
without your nod."). Bless empty states ("When the queue is clear, rest."). Faith vocabulary
is woven into content, not UI chrome.

**Header pattern.** Pad `56px 22px 16px` (clears the status bar / dynamic island). Optional
back row = small `‹` chevron + muted "Queue" label. Then the Newsreader page title, a small
muted date/subtitle, and where relevant a thin sage progress bar with an "N of N cleared" label.

Deliver: the screen rendered in the `IOSDevice` frame, in light by default with the
Light/Dark toggle working, plus a one-line note on each key interaction.
