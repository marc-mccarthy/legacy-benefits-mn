# www.andrewrinehart.us — capture notes

Every claim below is traceable to a file in this directory. Paths are repository-relative.
Nothing here was eyeballed; if a number is stated, a named artifact contains it.

## The headline: the effect the client asked for is not running on this site

The brief for this capture said `divi-particles` "ships `assets/particles.min.js` — this canvas
particle field is the effect the client specifically asked for". That is not what the site does.

Measured, in `effects/particles.config.json`:

- `live.particlesJsLoaded` is `true` — the library is on the page.
- `live.instanceCount` is **0**. `window.pJSDom` is an empty array.
- `source.initCalls` lists five `particlesJS()` calls: `divi-particles` through `divi-particles-4`.
- Each is wrapped in a guard, `jQuery('body').find('#divi-particles').length > 0`.
- `source.guardElementsPresentOnPage` records **all five ids as `present: false`**.

The plugin is installed and enqueued on every page load, and every one of its five initialisers
short-circuits because the element it looks for does not exist in this site's markup. **There is no
canvas on this page at all** — `routes/home/extract.desktop.native.json` → `media.canvases` has
length 0.

What actually animates the background is a self-hosted looping video, catalogued in
`effects/effects.json` → `video[0]`:

| property        | measured value                                                     |
| --------------- | ------------------------------------------------------------------ |
| `currentSrc`    | `…/wp-content/uploads/2023/02/Technology-888.m4v` (WebM alternate) |
| intrinsic       | 1280 × 720                                                         |
| rendered        | 1600 × 900 into a 1440px viewport — Divi oversizes it to cover     |
| flags           | `autoplay`, `loop`, `muted`, `playsInline`                         |
| `objectFit`     | `contain`                                                          |
| parent blending | `mix-blend-mode: normal`, `filter: none` — no compositing tricks   |

`effects/video-0-t1.home.png` and `…-t3.home.png` are frames taken by pausing and seeking the live
element at 1s and 3s. They are the **composited result** — the portrait and the typewriter text are
painted over the video and appear in them.

It is a dark, low-contrast "technology" texture. `shots/abovefold.home.desktop.png` shows it in
place: a cut-out portrait at left, the typewriter list at right, and the video reading as a faint
moving pattern behind both. **That is almost certainly why it was described as a particle effect** —
the stock footage looks like a node network, but no particle system is involved.

### Both readings are reimplementable, and they are different

`effects/particles.config.json` carries two configurations that must not be confused:

- `source.authoredConfig` — the plugin's shipped config, parsed out of its own script without
  executing it. All five calls are byte-identical (`source.allConfigsIdentical: true`).
- `probe` — that same config instantiated in the page during this run, against the site's own
  `particles.min.js`, and read back off the resulting live `pJS` instance.
  `probe.particlesLiveCount` is **162** particles on a 2880 × 1800 backing store at `pxratio` 2.

They disagree on purpose, and the reason is `retina_detect: true`. particles.js multiplies
`size.value`, `line_linked.distance`, `line_linked.width`, `move.speed` and every interactivity mode
distance by `devicePixelRatio` at init:

| key                      | authored | probe at dpr 2 |
| ------------------------ | -------- | -------------- |
| `particles.size.value`   | 5        | 10             |
| `line_linked.distance`   | 150      | 300            |
| `line_linked.width`      | 1        | 2              |
| `move.speed`             | 6        | 12             |
| `modes.grab.distance`    | 400      | 800            |
| `modes.repulse.distance` | 200      | 400            |

**Copy `authoredConfig` into a reimplementation. Expect the probe's numbers at 2×.** Doubling the
probe's numbers again is the mistake this table exists to prevent; the same caution is written into
the file itself as `readThisFirst`.

The rest is unmodified particles.js demo default: `number.value: 100` with
`density: { enable: true, value_area: 800 }` (which is why 162 particles exist at 2880 × 1800 rather
than 100), `color: #ffffff`, `shape.type: circle`, `opacity 0.5`, `line_linked.opacity 0.4`,
`onhover: repulse`, `onclick: push`. `shape.image.src` is still `"img/github.svg"` — a dead giveaway
that nobody ever configured this plugin.

`effects/SYNTHETIC-particles-never-renders-on-site-t600ms.png` and `…-t2400ms.png` show the field on
a neutral `#101014` backdrop at 600ms and 2400ms. They are **not pictures of this website.** The
disclaimer lives in the filename rather than only in prose because the earlier names
(`particles-probe-frame{0,1}.png`) read as ordinary artifacts: the images are a handsome linked-node
constellation, and a reviewer picking files to open from the index saw an attractive `particles-frame`
and never reached the caveat. The animated background on this site is the `<video>` described above.

## The page is one screen, and has no links

`routes/home/extract.desktop.native.json` → `geometry.scrollHeight` is **900** against an
`innerHeight` of 900. The document does not scroll at any of the four viewports. The four
`PAGE_IS_ONE_SCREEN` and two `ROUTE_NOT_SCROLLABLE` warnings in `index.json` record this per
viewport, and it is why there is no `shots/fullpage.*` artifact —
`shots/abovefold.home.<viewport>.png` **is** the whole page.

`domOutline` contains exactly one entry:
`.et_pb_section et_pb_section_0 et_pb_section_video et_pb_with_background et_section_regular`,
1440 × 900, padding `0px 0px 0px 0px`, one `<video>`, zero canvases.

The only `<a>` element on the page is MediaElement.js's volume slider. Navigation is entirely through
`divi-overlays` (`#overlay_unique_id_44` is in the DOM) triggered from the typewriter words. There is
no header, no nav, no footer — `chrome.header` and `chrome.navToggle` are `null` in the `SITES` table
in `scripts/capture-reference-site.mjs` for that reason, so no nav-open or nav-scrolled state was
attempted.

## Typewriter

`effects/typewriter.json`, plus eight frames in `effects/typewriter-*.png` sampled every 500ms from a
cold load.

- **One string, not four.** `data-string0` is `Founder<br />Venture<br />Real Estate<br />Contact`.
  Typed.js types the whole four-line block once and stops. There is no loop and no backspace cycle.
- Options read from the element's dataset: `typeSpeed: 80`, `startDelay: 0`, `backspeed: 40`,
  `backDelay: 1000`.
- The frames corroborate the speed independently: `""` at 0ms, `"Founde"` at 500ms,
  `"Founder/Ven"` at 1000ms, `"Founder/Venture"` at 1500ms, complete at 3500ms — about one character
  per 80ms, matching `typeSpeed: 80` exactly.
- The cursor's blink is a plain CSS animation and reads straight out of computed style:
  `animation: 0.7s infinite blink`, timing function `ease`, 35px, `#FFFFFF`.
- The element is `Open Sans` weight 500 at 35px / 49px line-height (ratio 1.4), `#FFFFFF`.

The 0ms sample being an empty string is what confirms the frames captured the animation rather than
its finished state. Sampling the page as found gives eight identical frames of the completed text;
the capture reloads the route specifically to avoid that.

## Type, colour and layout

From `routes/home/extract.desktop.native.json`:

- Three typographic roles resolve, all `Open Sans` weight 500: body 14px / 23.8px (ratio 1.7)
  `#666666`; paragraph and display both 35px / 49px (ratio 1.4) `#FFFFFF`. Letter-spacing is 0
  everywhere.
- `customProperties.count` is **15**, and every one is a WordPress admin default
  (`--wp-admin-theme-color`, `--wp-block-synced-color`, `--wp-editor-canvas-background`, …).
  **This site has no design token layer.** Nothing here is worth copying as a system.
- Colour ranked by painted area rather than frequency: `#000000` (1,440,000px²), `#222222`
  (1,440,000px²), `#FFFFFF` (1,296,000px²), then `#666666` and Divi's stock link blue `#2EA3F2`.
- The real backdrop is a gradient, not a flat colour. `gradients[1]` is
  `linear-gradient(rgba(11, 16, 28, 0.95) 0%, rgba(11, 16, 28, 0.98) 98%)` layered over
  `/wp-content/uploads/2023/02/My-project.png`. **`#0B101C` at 95–98% opacity is the actual dark
  field** the video shows through.
- `spacing.sectionPadding` has a single cluster, `0px / 0px`, across three elements. There is no
  vertical rhythm to measure. Containers are `none @ 1440px` — full bleed, no max-width.

## Motion

`motion.transitions` contains exactly three fingerprints, and all three belong to media-player chrome
or Divi's own plumbing:

| property  | duration | timing                        | instances | representative                |
| --------- | -------- | ----------------------------- | --------- | ----------------------------- |
| `all`     | 0.15s    | `ease-in`                     | 3         | `span.mejs-time-buffering`    |
| `display` | 0.3s     | `ease`                        | 1         | `span.et_pb_section_video_bg` |
| `height`  | 0.1s     | `cubic-bezier(0.44, 0, 1, 1)` | 1         | `span.mejs-time-hovered`      |

**No element on this page has an authored hover or scroll transition.** `states/deltas.json`
confirms it independently: 0 of 4 state probes produced a non-empty computed-style diff.

`motion.animations` has three, with keyframes serialised: `a` (1s linear infinite), `b` (2s linear
infinite) and `blink` (0.7s ease infinite).

`motion.reducedMotionRules` records 38 rules under `not (prefers-reduced-motion)`, and
`design-system.json` → `reducedMotion.blankSections` is **empty** — nothing disappears under
`prefers-reduced-motion: reduce`. `shots/reduced-motion.desktop.png` is the evidence. On this one
measure the site behaves better than ethnocare.ca, which loses three sections.

## Libraries

`libraries[]` in the extract, with `detectedVia` on each. Versions come from WordPress's `?ver=`
query parameter, which Divi appends to every enqueued script:

| library                     | version | detected via                       |
| --------------------------- | ------- | ---------------------------------- |
| Divi theme                  | 4.20.2  | script `?ver=`                     |
| wp-plugin `divi-particles`  | 7.0.4   | script `?ver=`                     |
| wp-plugin `divi-overlays`   | 2.9.7.2 | script `?ver=`                     |
| wp-plugin `divi-typewriter` | 1       | script `?ver=`                     |
| jQuery                      | 3.7.1   | `window.jQuery.fn`                 |
| MediaElement.js             | 4.2.17  | `window.mejs`                      |
| particles.js                | —       | `window.particlesJS`               |
| Typed.js                    | —       | `.typed-cursor`                    |
| WordPress / Divi builder    | —       | `window.wp`, `window.et_pb_custom` |

**`animate.css` 4.1.1 was not in the brief and is loaded from cdnjs.** Its stylesheet is cross-origin
and threw `SecurityError` on `.cssRules`; the twelve `STYLESHEET_CORS` warnings in `index.json`
record that, and the refetch through `page.request.get()` recovered it.
`extract.*.json` → `refetchedStylesheets` carries **60 keyframe names** from it, plus 30 `@font-face`
rules from each of the two Google Fonts sheets. Without that guard all of it would be silently
missing.

## Breakpoints

Measured by walking every reachable `@media` rule and tallying, in `breakpoints[]`. Ranked by rule
count, which separates real breakpoints from one-off patches:

| condition       | rules |
| --------------- | ----- |
| `max-width:980` | 247   |
| `max-width:767` | 163   |
| `min-width:981` | 142   |
| `min-width:600` | 23    |
| `max-width:479` | 12    |
| `min-width:768` | 4     |

Divi's stock ladder is 1405 / 1100 / 980 / 767 / 479. Only three of those five carry meaningful
weight here, and **1405 does not appear at all**.

## What could not be captured, and why

- **A live particle field.** It does not exist on this site. See the top of this file; the probe is
  the honest substitute and is labelled as one everywhere it appears.
- **Hover and focus deltas.** Attempted on both state targets at both full viewports; every diff came
  back empty because nothing on the page is interactive. `states/deltas.json` records the empty diffs
  rather than omitting them, so the absence is legible rather than looking like a capture failure.
- **Scroll frames, parallax fits and reveal thresholds.** The document does not scroll. There is no
  `scroll/` directory and no `motion/` directory for this site, and that is correct.
- **A `fullpage` shot.** Correctly absent — the page is exactly one viewport at every size, recorded
  as `PAGE_IS_ONE_SCREEN` rather than silently skipped.
