# AyuHerbalCare

Single-page marketing site for an Ayurvedic clinic. Static HTML, CSS and vanilla
JavaScript, bundled with Vite and deployed to Vercel. No UI framework.

---

## Getting started

```bash
npm install     # Node 20.19+ or 22.12+ required (Vite 7)
npm run dev     # dev server with HMR, opens automatically
```

`npm run dev` binds to `0.0.0.0`, so the URL it prints on your LAN address opens
on a real phone on the same Wi-Fi. That is the fastest way to check the layout on
hardware.

### Scripts

| Script                 | Does                                                            |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Dev server, HMR, exposed on the LAN                             |
| `npm run build`        | Production build into `dist/`                                   |
| `npm run preview`      | Serve the built `dist/` locally                                 |
| `npm run lint`         | ESLint over JS                                                  |
| `npm run lint:css`     | Stylelint over `src/**/*.css`                                   |
| `npm run format`       | Prettier, write                                                 |
| `npm run format:check` | Prettier, verify only                                           |
| `npm run test:ui`      | Responsive + accessibility sweep in headless Chrome (see below) |
| `npm run check`        | Everything above, in order — run this before pushing            |

### Deploy

Vercel builds from `main` with zero manual configuration; `vercel.json` pins the
framework, output directory, the `/AyuHerbalCare.html` → `/` redirect that
preserves the old design-export URL, immutable caching for hashed assets, and
basic security headers.

```bash
npm run check   # must pass
git push        # Vercel builds and deploys
```

---

## Structure

```
index.html                   the page — one file, section-commented
public/                      copied to the deploy root verbatim
  favicon.svg
  robots.txt
src/
  main.js                    entry: imports CSS, wires the three modules
  scripts/
    nav.js                   sticky header + mobile drawer
    reveal.js                IntersectionObserver scroll reveal
    form.js                  booking-form validation
  styles/
    main.css                 entry — @imports everything in cascade order
    tokens.css               <- design tokens. Start here.
    base.css                 reset, document defaults, focus, utilities
    layout.css               .wrap, .split, .section-head, .eyebrow, .stat-row
    components/              button, card, form, media, reveal
    sections/                header, hero, philosophy, services, process,
                             herbal, about, reviews, contact, footer
scripts/
  check-responsive.mjs       the headless sweep behind `npm run test:ui`
```

Cascade order is import order: tokens -> base -> layout -> components ->
sections. Vite inlines every `@import` at build time, so this ships as one
minified file — there is no runtime request waterfall.

### Dependencies, and why each one is here

Everything is a devDependency. **Nothing ships to the browser but the page's own
HTML, CSS and JS** — there is no runtime library.

| Package                           | Why                                                                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite`                            | Lets the CSS and JS be authored as many small files but ship as one minified, content-hashed bundle. Dev server with HMR.                                                                                                                                   |
| `lightningcss`                    | Earns its place three times over: `@custom-media` (so breakpoints are named, not magic numbers repeated in every query), automatic vendor prefixing driven by `browserslist`, and better CSS minification than the default.                                 |
| `browserslist`                    | Declares the supported-browser list once, in `package.json`, for Lightning CSS to read.                                                                                                                                                                     |
| `puppeteer-core` + `axe-core`     | The `test:ui` sweep. `puppeteer-core` ships **no** bundled browser — it drives the Chrome already installed on the machine. `axe-core` is the industry-standard a11y engine; hand-rolled contrast maths gets stacking contexts and alpha compositing wrong. |
| `eslint`, `stylelint`, `prettier` | Linting and formatting, config committed.                                                                                                                                                                                                                   |

No UI framework, no CSS framework, no animation library. A one-page site does not
need them, and each would cost more in bytes than it saves in code.

---

## Design tokens

Every colour, size, space and duration lives in
[`src/styles/tokens.css`](src/styles/tokens.css). There are no magic numbers
below that file — if you need a value that is not there, add a token.

### Breakpoints

Mobile-first. Every query is `min-width`; the base styles **are** the small-phone
styles and each breakpoint only ever adds.

| Token   | Width  | Target                                            |
| ------- | ------ | ------------------------------------------------- |
| (base)  | 320px  | small phone — iPhone SE 1st gen, Galaxy Fold      |
| `--sm`  | 480px  | large phone                                       |
| `--md`  | 768px  | tablet portrait — iPad Mini, iPad 10.9"           |
| `--lg`  | 1024px | tablet landscape / laptop — **nav switches here** |
| `--xl`  | 1280px | desktop                                           |
| `--xxl` | 1600px | large desktop                                     |

Plus two state queries: `--short` (landscape phone: `max-height: 34rem` and
landscape) and `--hover-pointer` (a real mouse, so hover effects never stick to a
touch screen).

Breakpoints are in `rem` deliberately. Media-query `rem` is always 16px — it is
not affected by the page's root font-size — but it _does_ respond to the user's
browser text-size setting, so someone running 20px text reaches the tablet layout
sooner, which is what they want. `px` breakpoints ignore that preference.

Use them by name; never repeat the number:

```css
@media (--lg) {
  /* ... */
}
```

### Type scale

Fluid sizes are `clamp(min, <rem base> + <vw slope>, max)`. The `rem` term is not
optional — a pure-`vw` middle value does not grow when the user zooms, which
fails WCAG 1.4.4. Every scale hits its minimum at exactly 320px.

| Token       | Range    | Used for                     |
| ----------- | -------- | ---------------------------- |
| `--fs-2xs`  | 11px     | micro labels, badge captions |
| `--fs-xs`   | 12px     | eyebrows, stat captions      |
| `--fs-sm`   | 13px     | nav, small links             |
| `--fs-md`   | 15px     | card body copy               |
| `--fs-base` | 16 -> 17 | body                         |
| `--fs-lg`   | 17 -> 19 | lead paragraphs              |
| `--fs-xl`   | 19 -> 22 | pull quotes                  |
| `--fs-h4`   | 22 -> 26 | card / step headings         |
| `--fs-h3`   | 24 -> 31 | service headings             |
| `--fs-h2`   | 32 -> 60 | section headings             |
| `--fs-h1`   | 40 -> 88 | hero                         |

`html` has **no** `font-size` override, so every `rem` is relative to whatever the
user set in their browser.

### Spacing

Static steps (`--space-3xs` … `--space-2xl`, 4px -> 64px) for rhythm inside a
component; fluid steps (`--space-fluid-sm` … `--space-fluid-xl`) for anything
separating major blocks. `--section-pad` (56px -> 128px) is the vertical padding
on every `<section>`.

The fluid steps reach their maximum between 1120px and 1280px, not at 1920px.
That is deliberate: it is what stops a large monitor from getting oceans of
whitespace while a phone still gets breathing room.

### Other token groups

`--container` / `--gutter` / `--header-h` / `--tap` (44px minimum target), radii,
three shadows, `--focus-ring` (an inherited property, so a dark section re-points
it once and every descendant gets a ring that still clears 3:1), `--dur-*`
durations (zeroed in one place under `prefers-reduced-motion`), and `--z-*` so
there is a single stacking order.

---

## Responsive behaviour

- **Layout**: CSS Grid and Flexbox throughout. Fluid grids use
  `repeat(auto-fit, minmax(min(100%, 17rem), 1fr))` — the `min(100%, …)` term is
  what stops a track demanding more width than its container.
- **Container queries** are used where the viewport is genuinely the wrong
  signal: the hero rating badge, the herbal inset image and the opening-hours
  rows all depend on how wide _their column_ is, which changes with the grid
  state and not just the window. Each degrades to the stacked layout on engines
  without support, because stacked is the default and the query only upgrades.
- **The hero** uses `100svh` with a `100vh` fallback. On iOS Safari `100vh` is
  the viewport _without_ the browser chrome subtracted, so a `100vh` hero is
  always taller than what the user can actually see.
- **Landscape phones** get a dedicated `--short` query: the hero drops its
  minimum height and the drawer tightens so its CTA stays above the fold.
- **Safe areas** are handled via `max(var(--gutter), env(safe-area-inset-*))` on
  the container and `env(safe-area-inset-bottom)` in the footer and drawer.
  `viewport-fit=cover` is set on the viewport meta — without it the insets are
  always zero.
- **No `overflow-x: hidden` on `<body>`.** Every overflow is fixed at source and
  verified. `html { overflow-x: clip }` remains as a net for anything unforeseen;
  `clip` rather than `hidden` because `hidden` silently makes the root a scroll
  container and breaks `position: sticky` in descendants.

## Performance

- Only `transform` and `opacity` animate. Nothing uses `transition: all`.
- The scroll handler defers its read into `requestAnimationFrame` and only writes
  the class when the value actually changes.
- Media boxes own their aspect ratio, so swapping a placeholder for a real image
  causes zero layout shift.
- Fonts are `preconnect`ed and `preload`ed with `display=swap`. They are the only
  third-party request on the page.
- Hover effects sit behind `@media (hover: hover) and (pointer: fine)` so they
  never stick after a tap.

Built output, brotli-compressed: **~6.6 KB CSS, ~1.2 KB JS, ~6.2 KB HTML.**

## Accessibility

`<main>` landmark, skip link, semantic heading order, `:focus-visible` rings on
everything, 44px minimum targets, `tel:`/`mailto:` links, `role="img"` +
`aria-label` on the star ratings and the Google wordmark so they are not spelled
out character by character.

The mobile drawer uses the native `inert` attribute: closed, it is out of both the
tab order and the accessibility tree; open, `inert` is applied to `<main>`,
`<footer>` and the header's own links, which is a focus trap with no key-by-key
JavaScript. Escape closes it and focus returns to the button.

`prefers-reduced-motion: reduce` zeroes the duration tokens, so every transition
in the system stops in one place.

---

## Adding real images

Every photograph slot is a `.media` box that already owns its aspect ratio, so
dropping an image in shifts nothing:

```html
<div class="media" style="--ratio: 4/5">
  <img
    src="/assets/shirodhara-800.avif"
    srcset="/assets/shirodhara-560.avif 560w, /assets/shirodhara-1200.avif 1200w"
    sizes="(min-width: 64rem) 42vw, 92vw"
    width="800"
    height="1000"
    alt="Warm herbal oil poured over a client's forehead during Shirodhara"
    loading="lazy"
    decoding="async"
  />
</div>
```

Delete the `.ph` placeholder div inside it. The hero image is the LCP element —
give that one `loading="eager"` and `fetchpriority="high"` instead. Once no `.ph`
elements remain, delete the `.ph` rules from
[`src/styles/components/media.css`](src/styles/components/media.css).

## Still to do (owner)

Search for `TODO(owner)` in `index.html`:

- real phone number, email and clinic address (currently placeholders);
- real social profile URLs (currently `#`);
- photographs.

The booking form has **no backend** — submitting shows the confirmation panel and
sends nothing. Every control already has a `name`, so pointing the `<form>` at an
endpoint, or POSTing `new FormData(form)` from `form.js`, is all that is needed.

---

## `npm run test:ui`

Drives the Chrome already installed on your machine (no browser download) against
a local `vite preview`, and at each of twelve viewports asserts:

1. the document does not scroll horizontally;
2. no visible element extends past either viewport edge;
3. every interactive control is at least 44x44px;
4. nothing is clipped by a fixed-height ancestor;
5. an open mobile drawer fits entirely above the fold.

Then it runs axe-core at a mobile and a desktop width for WCAG 2.1 A/AA.

Viewports covered: 320, 375, 390x844, 414, 768, 820, 844x390 (landscape), 1024,
1280, 1440, 1920, 2560.

Set `CHROME_PATH` if your browser is somewhere unusual.

## Manual device checklist

The sweep above cannot judge whether something _looks_ right. On real hardware:

- [ ] **iPhone SE / small phone (320–375px)** — hero headline does not wrap
      awkwardly; both CTAs are full-width and stacked; the Google badge sits
      _below_ the image, not overlapping it.
- [ ] **Rotate a phone to landscape** — the hero is content-height, not
      full-screen; open the menu and confirm "Book a Session" is visible without
      scrolling.
- [ ] **Notched phone, landscape** — no text under the notch on either side; the
      footer clears the home indicator.
- [ ] **iPad portrait (768–834px)** — the burger menu is showing, _not_ a squashed
      desktop nav. This was the worst bug in the previous build.
- [ ] **iPad landscape (1024px)** — the full nav fits on one line with no wrapping.
- [ ] **Tap a form field on a real iPhone** — the page must **not** zoom in.
- [ ] **Submit the empty form** — four fields go red, focus lands on the first.
- [ ] **1920px monitor** — content is centred and capped; spacing looks generous,
      not cavernous.
- [ ] **Keyboard only** — Tab from the top: the skip link appears first; every
      focused element has a visible ring; open the drawer and confirm Tab cannot
      escape behind it; Escape closes it and returns focus to the button.
- [ ] **Set text size to 200%** (iOS: Settings -> Display -> Text Size; desktop:
      Ctrl/Cmd +) — nothing overlaps or gets cut off.
- [ ] **Enable Reduce Motion** — sections appear instantly with no fade.
- [ ] **Throttle to Slow 4G** in DevTools — text renders before the webfont
      arrives rather than staying blank.
