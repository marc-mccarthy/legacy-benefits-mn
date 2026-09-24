# ethnocare.ca — capture notes

Every claim below is traceable to a file in this directory. Paths are repository-relative.
Nothing here was eyeballed; if a number is stated, a named artifact contains it.

The footer of every page credits **"Website by Locomotive"**, visible in
`shots/fullpage.academy.desktop.png`. That is the Montreal studio, and it explains the whole stack
below.

## Three briefed facts that this capture contradicts

### 1. There is no Barba.js, and no client-side page transitions at all

`routes/*/extract.*.json` → `libraries[]` contains no Barba entry at any of the four viewports on any
of the nine routes, and the pre-teardown DOM fingerprint (`data-barba` attributes) matches zero
elements. All four capture runs in `transitions/t*/styles.json` record `"barbaPresent": false`.

More decisively, `transitions/t0`, `t1` and `t2` all record `"navigationEventFired": true`. Clicking
a nav link performs a **real browser navigation**. There is no container swap to instrument.

What exists instead is a cold-load enter animation, driven by classes on `<html>`. The
`enterAnimation.classFlipTimeline` in each `transitions/t*/styles.json` measures it per frame. From
`transitions/t0/styles.json`:

| t (ms) | `<html>` classes added                                 | `.u-anim-page` opacity |
| ------ | ------------------------------------------------------ | ---------------------- |
| 16     | `is-loading`                                           | 0                      |
| 124    | `js-focus-visible`                                     | 0                      |
| 940    | `fonts-loaded`                                         | 0                      |
| 1303   | `lenis lenis-smooth`                                   | 0                      |
| 1652   | `is-first-loaded is-loaded` (and `is-loading` removed) | 0                      |
| 1839   | `is-infobar-enabled`                                   | 0.490                  |
| 1962   | `is-ready`                                             | 0.823                  |

The content is held at **opacity 0 until `is-loaded` lands**, then fades in over roughly **210–310ms**
as `is-ready` follows. The gate is the load sequence, not a fixed delay: the same timeline in `t1` and
`t2` fires at 1344→1553ms and 1133→1340ms respectively, so the absolute times move while the shape
does not. `window.config.CSS_CLASS` (captured in `siteConfig` in every extract) names these states
explicitly: `LOADING: "is-loading"`, `READY: "is-ready"`, `LOADED: "is-loaded"`.

`transitions/t*/f*.jpg` are CDP screencast frames, 122–124 per transition, timestamped from the click.
`transitions/t*/session.webm` is a watchable recording of the same traversal.

### 2. Lenis and Locomotive are both present — because on this site they are the same thing

`htmlClassesBeforeTeardown` in every native-pass extract reads:

```
js-focus-visible fonts-loaded lenis lenis-smooth is-first-loaded is-loaded is-infobar-enabled is-ready is-hero-animation-completed
```

and `dataScrollSpeedValues` records Locomotive's attribute vocabulary in use, with values `-0.1` and
`-0.02`. But there is **no `[data-scroll-container]`**, `htmlOverflow` computes to `auto`, and the
body carries a real multi-thousand-pixel height. That combination is **locomotive-scroll v5**, which
keeps native document flow and delegates the smoothing to Lenis. Both names are correct; there are
not two scroll systems fighting.

This matters for anyone re-running the capture: the smooth-scroll teardown in `capturePass()` strips
`html.lenis` and the `data-scroll*` attributes, and both libraries are bundled as ES modules with no
global. An extract taken after the teardown therefore reports neither. `libraries[]` is merged from a
snapshot taken **before** the teardown for exactly this reason, and each such entry is marked
`detectedVia: "… (pre-teardown)"`.

Full library list, from `libraries[]`:

| library            | version | detected via                        |
| ------------------ | ------- | ----------------------------------- |
| GSAP               | 3.15.0  | `window.gsapVersions`               |
| Vue 3              | —       | `window.__VUE_INSTANCE_SETTERS__`   |
| Lenis              | —       | `html.lenis` (pre-teardown)         |
| Locomotive Scroll  | —       | `data-scroll*` attrs (pre-teardown) |
| Shopify storefront | —       | `window.Shopify`                    |

GSAP exposes only `gsapVersions`, not a `gsap` global — it is bundled. Theme scripts are
`assets/app.js` and `assets/vendors.js`, catalogued in `network/assets.json`.

### 3. The Vimeo videos are not background videos

`effects/effects.json` → `video[]` and the three `VIDEO_NOT_RENDERED` warnings in `index.json`.

At **desktop**, three `<video class="c-video_element">` elements carry Vimeo progressive-MP4 sources
(`876484888`, `876488066`, `876488535`) and measure **0 × 0**, because each sits inside
`div.c-images-sequence_mobile`, which computes to `display: none` above the mobile breakpoint. They
are the **mobile fallback for the canvas image sequences**, not ambient background video. The fourth
`<video>` is `.c-video-player_video` inside `.c-modal-video`, `visibility: hidden` with no source
until the lightbox is opened.

At **mobile**, the relationship inverts: `.c-images-sequence_mobile` becomes `display: block`, the
videos render at 390 × 390 and 390 × 602, **zero canvases exist on the page**, and the Vimeo ids are
_different_ assets (`877504259`, `877504319`, `877504355`). That is where the "six Vimeo videos"
figure comes from — three desktop-DOM, three mobile, art-directed per breakpoint.

So the signature scroll effect is **a scroll-scrubbed `<canvas>` image sequence on desktop that
degrades to a looping video on mobile**. No frames of the Vimeo assets are in this tree; the capture
only samples effects at the desktop viewport, where these elements are `display: none`. Their URLs,
posters, intrinsic sizes and parent compositing are catalogued in `effects/effects.json`.

## The real signature effects

### Canvas image sequences — `effects/image-sequence-{0,1,2}.png`

Three of them on the home route, from `effects/effects.json` → `imageSequence`:

| #   | section height | canvas backing store | rendered   | labelled steps                                                              |
| --- | -------------- | -------------------- | ---------- | --------------------------------------------------------------------------- |
| 0   | 17,385px       | 2880 × 1800          | 1440 × 900 | "Enhance socket fit & stability", "Retrofit sizing", "Air expansion system" |
| 1   | 11,280px       | 2880 × 1800          | 1440 × 900 | —                                                                           |
| 2   | 4,080px        | 2880 × 1800          | 1440 × 900 | —                                                                           |

A section nineteen viewports tall pinning a full-bleed canvas and scrubbing frames against scroll
position. This is the single most expensive-looking thing on the site.

### WebGL gradient — `effects/webgl-gradient.png`

`.c-gradient canvas`, driven by `window.gradient`, a three.js scene. `effects/effects.json` →
`webglGradient` records `hasComposer: true` and `hasCustomPass: true` — an EffectComposer
post-processing chain, not a plain plane. Its shader uniforms are readable and are the reimplementation
interface:

```
uTime, uResolution, uPosition, uAccentColor, uBackgroundColor, uZoom, uTimeAmplitude
```

`uAccentColor` and `uBackgroundColor` mean the background animation is **theme-driven** — the object
also carries `onColorThemeChangeBind` and `onPageChangeBind` handlers.

**This, not a particle field, is the closest analogue on either reference site to "animated
background".**

## Page geometry

`routes/home/extract.desktop.native.json` → `geometry.scrollHeight` is **58,901px** at 1440 × 900.
That is 65 viewports, and at dpr 2 it is 117,802 device px — more than seven times Chromium's
16,384px raster ceiling. Full-page capture is therefore banded: `shots/fullpage.home.desktop-band*.jpg`,
ten bands of 6,000 CSS px each, `banded: true` with offsets in `index.json`. Twelve shorter routes
captured as single unbanded PNGs; 32 band files in total.

`domOutline` in the same file is the structural spine — sixteen named sections with measured tops:

| #   | slug                | top    | height | background | notes                            |
| --- | ------------------- | ------ | ------ | ---------- | -------------------------------- |
| 0   | `section-3d`        | 0      | 7,020  | `#000000`  | 1 canvas, "Introducing Overlay™" |
| 1   | `hero`              | 0      | 2,700  | —          |                                  |
| 3   | `fadein-text`       | 900    | 6,120  | —          | sticky text, scroll-scrubbed     |
| 4   | `push-products`     | 6,270  | 900    | `#000000`  | padding `0 20px`                 |
| 5   | `images-sequence`   | 6,420  | 17,385 | `#000000`  | 1 canvas + 1 (hidden) video      |
| 6   | `quote`             | 23,805 | 1,080  | `#000000`  | `u-theme-dark`                   |
| 7   | `fadein-text`       | 23,985 | 6,345  | `#000000`  |                                  |
| 8   | `images-sequence`   | 29,430 | 11,280 | `#000000`  |                                  |
| 9   | `carousel-circular` | 38,910 | 10,350 | —          |                                  |
| 10  | `fadein-text`       | 47,460 | 7,560  | `#000000`  |                                  |
| 11  | `images-sequence`   | 54,120 | 4,080  | `#000000`  |                                  |
| 12  | `specifications`    | 57,650 | 234    | —          |                                  |
| 13  | `pre-footer`        | 58,327 | 217    | `#000000`  | padding `20px`                   |
| 14  | `footer`            | 58,544 | 357    | `#000000`  | padding `0 20px 20px`            |

Note what is _not_ here: there is no conventional section rhythm. Nine of the sixteen sections are
between 4,000 and 17,000px tall, because each is a scroll-driven stage rather than a block of content.

## Design tokens

127 custom properties, captured **both as declared and as resolved** in
`customProperties.declared` / `.resolved`. The distinction is not academic on this site — the
declared values are a light theme that the page overrides wholesale:

| property                       | declared  | resolved  |
| ------------------------------ | --------- | --------- |
| `--color-text`                 | `#000000` | `#FFFFFF` |
| `--color-background`           | `#98BCCE` | `#000000` |
| `--color-accent`               | `#020B44` | `#00F5F3` |
| `--color-fadein-accent`        | `#FFFFFF` | `#00F5F3` |
| `--color-infos-bar-background` | `#E7E7E7` | `#282828` |

**Copy the resolved column.** `#00F5F3` is the signature cyan; `colors[]` ranks it with 526
occurrences across a small painted area, which is exactly what an accent looks like. By painted area
the page is `#000000` (84.8M px²), then `#E7E7E7`, `#FFFFFF`, `#666666`.

### The spacing scale, which the repo already half-knows

`src/app/globals.css` in this repository labels its scale "Named spacing scale (Ethnocare model)".
Here is the actual scale, measured, unitless (consumed through `calc()`):

| step     | desktop | mobile |
| -------- | ------- | ------ |
| micro    | 8       | 8      |
| tiny     | 20      | 20     |
| small    | 30      | 30     |
| medium   | 40      | 40     |
| large    | 80      | 52     |
| **big**  | **150** | 80     |
| huge     | 200     | 100    |
| enormous | 250     | 140    |

`--spacing-big: 150` is confirmed. Also `--grid-columns: 12`, `--grid-gutter: 20px`,
`--grid-margin: 20px`, `--header-height: 60px`, `--border-radius: 5px` (24 elements use it; three use
`50%`).

### Type

Two self-hosted faces, both `licensedThirdParty: true`, served from `ethnocare.ca/cdn/shop/t/2/assets/`
and catalogued but **not downloaded**:

- **HelveticaNowDisplay** — Regular, Regular Italic, Bold, Bold Italic. Everything except the display role.
- **PPMonumentExtended Bold** — the display face.

Measured roles (`typography[]`, desktop), with `measureCh` computed through canvas `measureText`
rather than the `width / (size × 0.5)` approximation:

| role    | face                | weight | size / line-height | ratio | letter-spacing | measure |
| ------- | ------------------- | ------ | ------------------ | ----- | -------------- | ------- |
| display | PPMonumentExtended  | 700    | **208px / 208px**  | 1.0   | **-0.06em**    | 6.8ch   |
| h3      | HelveticaNowDisplay | 400    | 32px / 38.4px      | 1.2   | -0.02em        | 12.2ch  |
| h2      | HelveticaNowDisplay | 700    | 24px / 36px        | 1.5   | 0              | 17.2ch  |
| body    | HelveticaNowDisplay | 400    | 16px / 24px        | 1.5   | 0              | —       |
| link    | HelveticaNowDisplay | 700    | 16px / 22.4px      | 1.4   | -0.02em        | 7.3ch   |

The 208px display face at -0.06em tracking is the "OVERLAY™" wordmark filling the hero —
`scroll/home.desktop.00-y0.jpg`. Body text is a conventional 16px/1.5; all of the drama is in the
display step and the section heights, not in the body scale.

## Motion

### The easing vocabulary is two curves

Census over every non-zero transition fingerprint on the home route (`motion.transitions`, summed by
`instanceCount`):

| timing function                      | instances |
| ------------------------------------ | --------- |
| `cubic-bezier(0.165, 0.84, 0.44, 1)` | 127       |
| `cubic-bezier(0.23, 1, 0.32, 1)`     | 115       |
| `ease`                               | 25        |
| `cubic-bezier(0.3, 0.1, 0, 1)`       | 8         |
| four others                          | ≤ 4 each  |

Those two are easeOutQuart and easeOutQuint. Durations cluster just as tightly:

| duration  | instances |
| --------- | --------- |
| **0.45s** | **164**   |
| 0.3s      | 41        |
| 0.6s      | 39        |
| 0.9s      | 35        |
| 0.15s     | 4         |

**`0.45s cubic-bezier(0.23, 1, 0.32, 1)` on `transform` (52 instances) is the house transition.**
`0.45s cubic-bezier(0.165, 0.84, 0.44, 1)` on `opacity` and `color` is the other half. Everything else
is a rounding error. Eleven `@keyframes` are defined; the named animations are `revealVideoPlayerSwitch`
(0.3s), `fade` (1.2s ease-in-out infinite) and `rotate` (0.8s linear infinite), each with its keyframe
declarations serialised in `motion.animations`.

### Reveals fire at the very bottom of the viewport

`motion/reveals-observed.json` → `thresholdsByClass`. `.is-inview` is the only class with enough
usable samples to state a threshold:

- 25 events, 16 usable
- **median `viewportFraction` 0.9912**, range 0.7711 – 0.9984

That is the element's `getBoundingClientRect().top` as a fraction of viewport height at the instant
the class flips. Reveals therefore fire when the element's top crosses roughly **99% of viewport
height** — essentially the moment it touches the bottom edge, not the common 80% rule. This is the
number that maps to `Reveal`'s `viewport.margin` prop in `src/components/motion/reveal.tsx`.

Note that Locomotive computes in-view state in its own rAF loop and constructs **no
IntersectionObserver**, so this figure comes from the empirical `MutationObserver` detector, not from
`observersDeclared`.

### Parallax is not linear anywhere

`motion/scroll-linked.json`. Nine elements carrying `data-scroll-speed` were fitted by least squares
against scrollY across the live-pass frames. Every single r² is poor:

| route / viewport                      | `data-scroll-speed` | slope   | r²    |
| ------------------------------------- | ------------------- | ------- | ----- |
| product-overlay-transtibial / desktop | -0.1                | 0.02983 | 0.677 |
| about-us / mobile                     | -0.02               | 0.00110 | 0.715 |
| home / mobile                         | -0.1                | 0.01887 | 0.581 |
| underlay / desktop                    | -0.1                | 0.00258 | 0.273 |

**Do not specify a parallax ratio from this site.** The declared `data-scroll-speed` is a Locomotive
input, not the realised translate; the motion is eased and clamped, which is what r² between 0.27 and
0.72 means. A spec should say "eased, clamped parallax at low amplitude", and if it needs a number it
should use the declared `-0.1` / `-0.02` attribute values rather than the fitted slopes.

### The header does not react to scroll

`states/deltas.json`, the `header` / `scrolled` entry. After scrolling 900px, every tracked property
on `header.c-header` is byte-identical: `backgroundColor rgba(0,0,0,0)`, `height 60px`,
`transform matrix(1,0,0,1,0,0)`, `backdropFilter none`, `boxShadow none`, `classes "c-header"`.
It is a fixed, permanently transparent 60px bar. `states/nav-scrolled.*.jpg` corroborate.

### Hover states are quieter than the site looks

127 state probes, of which **29 produced a non-empty computed-style diff**. The recurring one is
`nav-link:focus` → `outlineWidth 0px → 3px`. The dramatic motion on this site is in scroll-driven
sections, not in hover affordances.

## Accessibility: three sections vanish under reduced motion

`design-system.json` → `reducedMotion.blankSections`, and the `REDUCED_MOTION_BLANK_SECTIONS` warning
in `index.json`. Under `prefers-reduced-motion: reduce`, three `.c-fadein-text -fade-out` sections —
**6,120px, 6,345px and 7,560px tall** — remain at `opacity: 0` with `visibility: visible`. Twenty
thousand pixels of copy is invisible to a reduced-motion user.

`shots/reduced-motion.desktop.png` is the evidence. This is precisely the failure
`e2e/motion.spec.ts` in this repository was written against, and this site's audience skews far less
toward reduced motion than a Medicare marketing site's does. **Do not copy this pattern.**

`motion.reducedMotionRules` shows a single `(prefers-reduced-motion)` media rule in the entire
stylesheet, which is why.

## Breakpoints

`window.config.BREAKPOINTS` is published on the page and captured verbatim in `siteConfig` in every
extract — better than inferring the ladder from CSS:

```
TINY 500 · SMALL 700 · MEDIUM 1000 · LARGE 1200 · BIG 1400 · HUGE 1600 · ENORMOUS 1800 · GIGANTIC 2000 · COLOSSAL 2400
```

The measured `@media` tally in `breakpoints[]` shows which of those carry weight:

| condition        | rules |
| ---------------- | ----- |
| `min-width:700`  | 277   |
| `max-width:699`  | 122   |
| `min-width:1000` | 69    |
| `max-width:999`  | 52    |
| `max-width:640`  | 26    |
| `min-width:1200` | 4     |

**700px is the real breakpoint.** Nine of the eighteen declared steps have four rules or fewer.

## What could not be captured, and why

- **Frames of the three Vimeo assets.** They are `display: none` at the desktop viewport where the
  effects pass runs, and `boundingBox()` returns `null`. Three `VIDEO_NOT_RENDERED` warnings record
  this per element with the reason. Capturing them would require running the effects pass at the
  mobile viewport, where they are visible. Metadata is complete either way.
- **`.u-hover-underline` hover deltas** — 17 `STATE_CAPTURE_FAILED` warnings. Every visible candidate
  was tried; on these routes the class only appears inside the closed menu modal.
- **Scroll frames for `/pages/support` at desktop** — one `SCROLL_DID_NOT_ADVANCE`. The page moved
  42px against a requested full-travel delta, so the remaining frames were abandoned rather than
  emitting fifteen copies of the hero. Its tablet capture records `PAGE_IS_ONE_SCREEN` (1,311px
  against a 1,112px viewport), so the route is genuinely short.
- **55 `LAZY_IMAGES_INCOMPLETE` warnings.** Between one and eight images per route never reached
  `complete && naturalWidth > 0` inside the 10s cap, on a page that is 65 viewports tall. Each warning
  lists the specific URLs in `affects[]`. Screenshots of those regions may show a placeholder.
