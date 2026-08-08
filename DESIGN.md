---
name: Acrab
description: Светлая учебная система для последовательного изучения литературного арабского.
colors:
  canvas: "#ffffff"
  surface-soft: "#faf6ee"
  ink: "#15120c"
  ink-body: "#55504a"
  ink-muted: "#6f695f"
  ink-faint: "#7a746a"
  gold: "#d4a854"
  gold-text: "#8a5a0e"
  gold-strong: "#a06f16"
  line: "rgba(21, 18, 12, 0.1)"
  line-soft: "rgba(21, 18, 12, 0.06)"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "clamp(2.3rem, 5.4vw, 3.4rem)"
    fontWeight: 700
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 800
    letterSpacing: "0.1em"
  arabic:
    fontFamily: "Geeza Pro, Noto Naskh Arabic, Al Bayan, serif"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  screenshot: "20px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.md}"
    padding: "10px 17px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 17px"
    height: "46px"
  surface-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: Acrab

## Overview

**Creative North Star: "The Guided Margin"**

Acrab feels like a carefully annotated study path: quiet white space, precise dark type, sparse gold markers and real lesson screens. The interface does not imitate a textbook or decorate itself with Arabic motifs. Its identity comes from sequencing, legible Arabic text and evidence from the product.

The product tour may persuade, while guides remain comfortable to read. Both share the same restrained palette and direct language.

**Key Characteristics:**

- White canvas with one warm gold voice.
- Large, dense sans-serif headlines paired with measured body copy.
- Real app screens used as proof, never generic illustrations.
- Thin dividers and tonal surfaces before shadows.
- Responsive layouts collapse to one readable column without horizontal scroll.

## Colors

Gold marks progress, focus and action; neutral ink carries almost all reading. Secondary text must remain WCAG AA compliant on white.

### Primary

- **Learning Gold:** used for progress markers, active navigation, small labels and instructional emphasis.
- **Deep Gold:** used where gold must carry small text or a focus outline.

### Neutral

- **Clear Canvas:** the default page and component background.
- **Warm Study Surface:** a quiet background for answers, notes and selected states.
- **Primary Ink:** headlines, strong labels and high-emphasis controls.
- **Reading Ink:** paragraphs and explanatory copy.
- **Muted Ink:** breadcrumbs, captions and metadata; it is deliberately dark enough for small text.
- **Hairline Ink:** subtle borders and section dividers.

**The One Gold Voice Rule.** Gold identifies learning progress or an actionable state; it does not become a large decorative field.

## Typography

**Display Font:** the native system sans-serif stack.
**Body Font:** the same native system sans-serif stack.
**Arabic Font:** Geeza Pro with Noto Naskh Arabic, Al Bayan and serif fallbacks.

**Character:** compact, modern and immediately legible. Hierarchy comes from size and weight rather than switching type families.

### Hierarchy

- **Display** (700, responsive 2.3–3.4rem, 1.04): one decisive page promise.
- **Headline** (700, responsive 1.65–2.3rem, about 1.15): article and feature sections.
- **Title** (650–700, 15–19px): component and navigation labels.
- **Body** (400, 17px, 1.6): reading copy, normally constrained to roughly 65–72 characters.
- **Label** (800, 12px, 0.1em, uppercase): rare section or learning-stage markers.

**The Arabic Is Content Rule.** Arabic examples use the dedicated script stack, correct language and direction attributes, and enough line height for marks above and below the baseline.

## Layout

The shared container is at most 1060px wide with 24px desktop gutters and 16px phone gutters. Product sections use asymmetric text-and-screen grids; long guides use a 180px sticky contents rail beside a reading column capped near 720px. At 860px these become one column, and at 640px navigation, grids, calls to action and related links reflow for phone widths.

Vertical rhythm is generous between ideas and tighter inside a single explanation. Headings always have more space above than below.

## Elevation & Depth

The system is flat by default. Borders, warm tonal surfaces and crop boundaries establish most depth. Soft shadows are reserved for real screenshots, panels and a small number of hover states.

### Shadow Vocabulary

- **Screenshot lift:** a 1px neutral contact shadow plus a wide, low-opacity warm shadow beneath product captures.
- **Panel lift:** a very soft neutral contact shadow and a shallow ambient shadow for payment or support panels.

**The Evidence Floats Rule.** Product screenshots may lift from the page because they are proof; ordinary text containers remain flat.

## Shapes

Corners progress from 8px labels to 12px controls, 16px sections and 20px screenshot frames. Thin neutral borders define edges. Fully round shapes are limited to counts, status marks and icon treatments whose meaning depends on being circular.

## Components

### Buttons

- **Shape:** compact rounded rectangle (12px), at least 46px high.
- **Primary:** primary ink with white text; inside dark callouts the relationship reverses.
- **Secondary:** white or transparent surface with a subtle neutral border.
- **Hover / Focus:** a one-pixel upward response on hover and a 2px deep-gold focus outline.

### Cards / Containers

- **Corner Style:** 16px for article and feature surfaces; 20px for screenshots.
- **Background:** white or warm study surface.
- **Shadow Strategy:** flat unless the container is an app screenshot or task panel.
- **Border:** one-pixel neutral line.
- **Internal Padding:** normally 16–24px, increasing for primary callouts.

### Navigation

The desktop header is sticky, white and separated by a hairline. Labels are muted at rest, primary ink on hover, and the current page receives a thin gold underline. On phones the brand sits above the four compact product routes; the row never wraps.

### Guide Contents

Desktop guides use a sticky, text-only contents rail. On phones it becomes a wrapping row with a divider; it never turns into a drawer or hides the article structure.

### Store Links

Store actions pair a platform mark with a two-line label inside a 46px control. They may become two equal columns on phones, with the full control remaining tappable.

## Do's and Don'ts

### Do:

- **Do** use real app screens and specific lesson examples as the primary proof.
- **Do** keep one clear action near the product promise and repeat it only at a natural decision point.
- **Do** use thin dividers and whitespace to organize long reading pages.
- **Do** preserve correct Arabic direction, font fallback and generous vertical metrics.
- **Do** keep secondary copy at 4.5:1 contrast or better on white.

### Don't:

- **Don't** invent ratings, testimonials, student counts or learning-speed claims.
- **Don't** replace useful educational copy with keyword repetition.
- **Don't** introduce ornamental Arabic patterns, glass effects or gradient text.
- **Don't** put ordinary article paragraphs into nested cards.
- **Don't** add a fifth compact header tab; link guides contextually and through the footer.
