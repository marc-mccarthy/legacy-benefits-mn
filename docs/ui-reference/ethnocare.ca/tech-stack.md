# ethnocare.ca — technology stack

Captured 2026-09-18 from `https://ethnocare.ca/` and `https://ethnocare.ca/products/overlay-transtibial`,
viewport 1440×900, headless Chromium (Playwright 1.61.1) plus `curl`. Every claim below carries the
evidence that produced it. Confidence levels are `observed` (read off a live object or a response
header), `parsed` (extracted from a URL path or a response body), `inferred` (reasoned from an API
surface or a behavioural fingerprint, with the reasoning stated).

Nothing on this site was downloaded to the repository. Bundles were streamed through `grep` in memory
and discarded.

---

## Platform and CMS

**Shopify**, hosted storefront, not headless.

What settles it, rather than merely suggesting it: the response sets `_shopify_y`, `_shopify_s` and
`_shopify_essential` cookies on the `ethnocare.ca` domain, and returns `powered-by: Shopify` together
with `shopify-complexity-score: 0` / `shopify-complexity-score-v2: 89` — headers no proxy in front of
a non-Shopify origin emits. `server-timing` carries Shopify's internal trace
(`pageType;desc="index"`, `theme;desc="149486010687"`, `servedBy;desc="bdww"`). An inline
`Shopify.shop = "ethnocare.myshopify.com"` confirms the tenant.

Rendering is server-side Liquid. There is no `__NEXT_DATA__`, no `_nuxt`, no hydration root and no
framework mount point in the markup — the Vue runtime described below is used for islands, not for
the page.

## Hosting, CDN and edge

| Layer                         | Evidence                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Shopify on GCP                | `x-dc: gcp-us-central1,gcp-us-central1,gcp-us-central1`                                                                   |
| Cloudflare at the edge        | `server: cloudflare`, `cf-ray: …-MSP`, `nel` / `report-to` pointing at `a.nel.cloudflare.com`                             |
| HTML is not cached            | `cf-cache-status: DYNAMIC`, `cdn-cache-control: no-cache, no-store`, `cache-control: private, max-age=0, must-revalidate` |
| Theme assets are cached hard  | `cache-control: public, max-age=31557600` and `cf-cache-status: HIT` with `age: 3703467` on `vendors.js`                  |
| **A second, independent CDN** | `d2v86sfld009ae.cloudfront.net` — `via: 1.1 …cloudfront.net (CloudFront)`, `server: AmazonS3`, `x-amz-cf-pop: MSP50-P4`   |

That CloudFront distribution is the single most important infrastructure fact on the page and is
covered under _Image and video delivery_ below. It is **not** Shopify's CDN; it is an S3 bucket the
build pushes to, fronted by CloudFront, and it serves 2006 of the 2100-odd requests the homepage
makes.

`content-security-policy: block-all-mixed-content; frame-ancestors 'none'; upgrade-insecure-requests;`
— Shopify's stock storefront CSP. It does not restrict script sources, so it constrains nothing about
the stack.

## Theme

A **bespoke theme, not a Theme Store theme**:

- `data-theme-name="Ethnocare"`, `data-theme-version="1.1.0"`, `data-theme-instance-id="149486010687"`
  on an element in the document (`observed`).
- `Shopify.theme = {"name":"ethnocare.ca/main"…}` with `Shopify.theme.handle = "null"` — a Theme
  Store theme reports its handle here (`dawn`, `refresh`, …). A null handle means the theme was
  uploaded, not installed.
- Asset path `/cdn/shop/t/2/assets/` — theme slot 2, three files total: `main.css`, `app.js`,
  `vendors.js`. A Theme Store theme ships dozens.

**The theme was built by the agency Locomotive** (Montréal). The footer carries
`<a href="https://locomotive.ca" …>Website by Locomotive</a>`, and the entire front-end is Locomotive's
open-source house stack — `modularjs`, `locomotive-scroll`, and their `c-` / `u-` / `-modifier` class
convention with `||` as a class-group separator (`class="c-product-gallery_container || swiper-container"`).
That attribution matters for the rebuild: the behaviours below are documented, reusable open-source
packages, not one-off theme code.

## Animation and scroll stack

This is the part the rebuild exists for, so it is broken out claim by claim.

### Who owns scrolling: Lenis

**Lenis 1.0.29**, `observed` — the library sets `window.lenisVersion = "1.0.29"`, which I read off the
live page; the same string appears in the bundle as `window.lenisVersion="1.0.29"`.

It is running in **native-scroll mode, not transform mode**. Verified at runtime after scrolling:
`window.scrollY` was `15352` with `document.scrollingElement.scrollTop` matching, and the computed
`transform` on the content wrapper was `none`. `<html>` carries `lenis lenis-smooth lenis-scrolling`.
So Lenis is normalising wheel and touch deltas and driving the browser's own scroll position — it is
**not** translating a fixed container. Anchors, `position: sticky`, native scroll restoration and the
scrollbar all keep working. This is the single most important implementation detail to copy.

Nested scrollers opt out with `data-lenis-prevent` (present on all four modals — menu, cart, video,
distributors). Wheel sensitivity is tuned: `lenisOptions: { wheelMultiplier: 1.6 }`.

### Who owns reveals and scroll progress: Locomotive Scroll v5

**locomotive-scroll v5.x**, `inferred` (no version constant survives the build — see _Least-confident
findings_). The identification itself is strong:

- The wrapper class in `app.js` is constructed as
  `new (…)({ scrollCallback, modularInstance, lenisOptions, triggerRootMargin, rafRootMargin, autoResize, initCustomTicker, destroyCustomTicker })`
  and exposes `this.lenisInstance` and `this.coreInstance`. That is verbatim the Locomotive Scroll **v5**
  constructor — v4's was `{ el, smooth, multiplier, lerp, … }` and had no Lenis inside it.
- The live DOM uses the v5 attribute vocabulary: `data-scroll`, `data-scroll-call`,
  `data-scroll-call-self`, `data-scroll-repeat`, `data-scroll-offset`, `data-scroll-speed`,
  `data-scroll-event-progress`, `data-scroll-module-progress`, `data-scroll-orientation`,
  `data-scroll-disable-touch-speed`, `data-scroll-to`, `data-scroll-to-offset`. `data-scroll-module-progress`
  exists only in v5, where it routes scroll progress into a modularjs module method.
- 37 elements carry `data-scroll` on the homepage.

**Lenis and Locomotive do not conflict, and they are not redundant.** Locomotive Scroll v5 is a
rewrite that _depends on_ Lenis: v5 deleted its own smooth-scroll engine, delegates all easing to
Lenis (hence `lenisOptions` being a pass-through), and keeps only the IntersectionObserver-driven
in-view / progress layer. Seeing both names is the expected signature of one library, not two
competing ones. A rebuild that adopts Locomotive v5 gets Lenis whether it asks for it or not.

### Who owns tweening: GSAP

**GSAP 3.15.0**, `observed` — `window.gsapVersions` evaluates to `"3.15.0"` on the live page (GSAP
pushes its version into that array on wake even when the `gsap` object itself stays in module scope;
there is no `window.gsap` here). The bundle carries `Jt.version=Vi.version=gi.version="3.15.0"` three
times.

Registered plugins, `parsed` from the bundle, all at 3.15.0:

- **ScrollTrigger** — but note `document.querySelectorAll(".pin-spacer").length === 0` after scrolling
  the full 58,901 px homepage. **Nothing is pinned.** ScrollTrigger is being used for scroll-linked
  tweens and callbacks only. If the rebuild's design assumes pinned sections, that assumption does not
  come from this site.
- **SplitText** — the character/word splitter. `data-split-text-chars` appears in the markup. Note
  that SplitText became free with GSAP 3.13; at 3.15.0 no Club licence is required.
- **CustomEase** — `"Please gsap.registerPlugin(CustomEase)"` appears verbatim in the bundle.
- `CSSPlugin` (`name:"css"`), plus the built-in `snap`, `modifiers` and `roundProps` property plugins.

Conspicuously **not** present: ScrollSmoother (0 matches), Draggable, Flip as a registered plugin,
ScrollToPlugin. Smooth scrolling is Lenis's job here, not GSAP's — the two are not layered.

### Who owns page transitions: modularjs — _not_ Barba

**Barba.js is not on this site.** Case-sensitive search of the served HTML and of the full 1,108,575-byte
`app.js` returns zero matches for `barba` or `Barba`, and `document.querySelectorAll("[data-barba]").length`
is `0` at runtime on both pages I loaded.

The reason Barba looks present at a glance is a false positive worth recording so nobody re-derives it:
the page lists a distributor at **"Ul. Svete Barbare 30-a, 10408, Velika Mlaka, Croatia"**, nine times.
A case-insensitive substring search for `barba` hits that address.

Transitions are **modularjs** (`modularorg/modularjs`, Locomotive's module loader, successor to their
`modujs`). `inferred`, on this evidence: the bundle contains `this.namespace = "modular"` inside a
constructor whose defaults are
`{ transitionDelay, isLoaded, isEntered, isUrl, transitionContainer, popstateIgnore }` — modularjs's
`App` options, including its own history-API page-transition system. The DOM matches: `<body data-module-load …>`
and 41 elements carrying a `data-module-*` attribute (`data-module-hero`, `data-module-video-player`,
`data-module-images-sequence`, `data-module-carousel-circular`, `data-module-fadein-text-progress`,
`data-module-modal-menu`, …). Modules are addressed by name and receive scroll progress from Locomotive
via `modularInstance`.

`data-frame-enter` / `data-frame-leave` in the markup are this theme's own transition hooks, not a
library's.

### WebGL: two separate three.js scenes

**three.js r152**, `parsed` — the bundle contains `var C0="152"` immediately followed by three's
`MOUSE` and `TOUCH` constant tables (`{LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2}`), which is how
`REVISION` appears after minification. r152 dates to May 2023 and matches the theme's 2023 asset
timestamps.

Two live WebGL canvases, each 1440×900, confirmed by walking the DOM at runtime:

1. **`.c-gradient`** — the animated background. Exposed as `window.gradient`, whose own keys are
   `scene, camera, renderer, material, plane, camUnit, composer, counter, customPass, time, progress,
containerMetrics, onColorThemeChangeBind, onPageChangeBind`. A single full-viewport `plane` with a
   `ShaderMaterial`, run through an `EffectComposer` with a `customPass`. It reacts to theme changes
   (`onColorThemeChangeBind`) and page changes, so it persists across modularjs transitions. The bundle
   carries hand-written GLSL — 57 `varying vec2` and 36 `gl_FragColor` occurrences, 18 `ShaderMaterial`,
   11 `glsl` tagged templates.
2. **`.c-section-3d_scene`** — a real product model. `overlay7.compressed.glb` (358,701 bytes) is loaded
   from the Shopify theme assets and decoded with three's **DRACOLoader against Google's hosted decoder**:
   `https://www.gstatic.com/draco/v1/decoders/draco_decoder.wasm` (88,859 B) and `draco_wasm_wrapper.js`
   (11,848 B) were both requested at runtime. Lighting uses a **cubemap** shipped as six theme assets,
   `nx.jpg / ny.jpg / nz.jpg / px.jpg / py.jpg / pz.jpg`.

The gradient canvas is present on the product page too; the 3D scene is homepage-only.

### Scroll-scrubbed image sequences

Three `<canvas class="c-images-sequence_canvas">` elements, driven by `data-module-images-sequence`.
Configuration is in the markup (`observed`):

| Sequence       | Frames   |
| -------------- | -------- |
| `overlay6/001` | 1100     |
| `overlay6/002` | 693      |
| `overlay6/003` | 213      |
| **Total**      | **2006** |

URL grammar, `observed` from the network log:
`https://d2v86sfld009ae.cloudfront.net/overlay6/{001,002,003}/{desktop,mobile}/{NNNN}.webp` — four-digit
zero-padded frame index, WebP, with a `mobile/` variant alongside `desktop/` (I confirmed `mobile/0000.webp`
returns 200 at 1,546 B versus 3,554 B for desktop).

Two details worth stealing and one worth fearing:

- **The loader fetches by bisection, not in order.** Observed request order began `0000, 1099, 0550,
0275, 0825, 0138` — endpoints first, then progressive midpoint refinement, so a coarse version of the
  sequence is scrubbable long before the last frame lands.
- **All 2006 frames are fetched on page load.** Estimated payload **≈29 MiB** — method: I measured 12
  evenly spaced desktop frames of `overlay6/001` (`0000, 0100, … 1099`), mean 15,573 B/frame, applied to
  all 2006 frames. Individual frames ranged 3,554–15,028 B. This is the dominant cost of the page and
  the thing a Medicare marketing site with a Core Web Vitals obligation should think hardest about
  before copying.

## Other JavaScript

| Library                       | Version | Confidence | Detected via                                                                                                                                                                         | Role                                                                                                                                       |
| ----------------------------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Vue                           | 3.5.38  | `parsed`   | `var $v="3.5.38"` adjacent to `createComponentInstance` / `renderComponentRoot` in `app.js`; `__VUE_OPTIONS_API__`, `__VUE_PROD_DEVTOOLS__`, `[Vue warn]` present                    | Reactive islands inside the Liquid page. Bundled, not CDN; no `window.Vue`. Easy to miss — grep for `Vue` in the bundle, not for a global. |
| Swiper                        | 11.x    | `inferred` | Runtime fingerprint of the live instance on the product page                                                                                                                         | Product gallery (`.c-product-gallery_container`)                                                                                           |
| focus-trap                    | —       | `parsed`   | Verbatim error strings `"Your focus-trap needs to have at least one focusable element"` in `app.js`                                                                                  | Modal focus management (4 modals)                                                                                                          |
| focus-visible polyfill (WICG) | —       | `observed` | `vendors.js` is _only_ this polyfill — 3,051 B, ending `//# sourceMappingURL=focus-visible.min.js.map`; `window.applyFocusVisiblePolyfill` exists; `<html class="js-focus-visible">` | `:focus-visible` shim                                                                                                                      |

The Swiper version deserves its reasoning shown, because there is no version string in the bundle. On
the live instance I read `swiper.params` and found `loopAddBlankSlides: true`, `loopPreventsSliding`,
`swiperElementNodeName` and `eventsPrefix` **present**, while `loopedSlides`, `loopFillGroupWithBlank`,
`preloadImages`, `lazy` and `watchSlidesVisibility` are **absent**. `swiper.el` and `swiper.wrapperEl`
are `HTMLElement`s, `swiper.slides` is a plain `Array`, and `window.Dom7` is undefined. Dom7's removal
puts it at v9+; `loopAddBlankSlides` arrived with the v11 loop rewrite and `loopedSlides` was removed at
the same time. Hence v11.x. Generated classes on the element are `swiper-initialized swiper-horizontal
swiper-backface-hidden`; `swiper-container` sits next to them but is the theme's own authored class, not
Swiper's (Swiper dropped that name at v9).

**Correction to a prior note:** `vendors.js` is not the vendor bundle. It is 3,051 B of focus-visible
polyfill and nothing else. Every library above ships inside `app.js` — 1,108,575 B raw, **338,701 B over
the wire** compressed.

## Fonts — read this before copying anything

| Family                    | Faces                                      | Delivery                                                                                                      | `font-display` | Licence posture                                               |
| ------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------------------------------------- |
| **Helvetica Now Display** | Regular, Regular Italic, Bold, Bold Italic | Self-hosted `.woff2` (+`.woff`) at `/cdn/shop/t/2/assets/HelveticaNowDisplay-*.woff2`, all four `rel=preload` | `swap`         | **Monotype, commercial.** Not an open-licence service.        |
| **PP Monument Extended**  | Bold only                                  | Self-hosted `/cdn/shop/t/2/assets/PPMonumentExtended-Bold.woff2`, preloaded                                   | `swap`         | **Pangram Pangram, commercial.** Not an open-licence service. |
| `swiper-icons`            | 400                                        | base64 `woff` inlined in `main.css`                                                                           | `auto`         | MIT, ships with Swiper                                        |

All five real faces were `loaded` in `document.fonts` at runtime; transfer sizes 21,980–51,512 B.
Computed stack on body and headings:
`HelveticaNowDisplay, -apple-system, system-ui, "avenir next", avenir, "segoe ui", "helvetica neue", helvetica, Cantarell, Ubuntu, roboto, noto, arial, sans-serif`.

**Neither face may be taken from this site.** Both are paid foundry webfonts served from Ethnocare's own
CDN under a licence issued to Ethnocare for the `ethnocare.ca` domain. Re-hosting either `.woff2` on a
different domain breaches every standard foundry webfont EULA, Monotype's and Pangram Pangram's included.
If the rebuild wants this typographic feel it needs either its own licence or a substitute — the
practical open-licence stand-ins are Inter or Geist for Helvetica Now Display, and Archivo Expanded or
Anton for PP Monument Extended's wide display voice.

## Image and video delivery

**Images** — Shopify's image CDN with query-parameter transforms, not the legacy filename suffixes.
Observed parameters across the homepage: `width=` (18 uses), `height=` (14), `format=` and the
cache-busting `v=`. Example:
`/cdn/shop/files/Ethnocare_Overlay_product-photo-0deg_2024-04-16.jpg?format=webp&v=1747754349&width=1200`,
issued as `<link rel="preload" as="image" fetchpriority="high">`. **No `_1600x` / `_NxN` suffixes appear
anywhere** — a spec that assumes that grammar would be assuming the wrong one. Notably, no `srcset`
width ladder either; the theme picks a single width per slot.

**Video** — six Vimeo **progressive-redirect MP4s**, not the Vimeo player:
`https://player.vimeo.com/progressive_redirect/playback/{876484888,876488066,876488535,877504259,877504319,877504355}/rendition/720p/file.mp4?loc=external&log_user=0&signature=…`
played in four bare `<video>` elements. There is no `player.vimeo.com/video/` iframe, no Vimeo Player SDK,
no Plyr, no video.js and no HLS. The theme implements its own `progressiveMute` / `progressiveUnmute`
volume ramp on `HTMLVideoElement.volume` over a 20 ms interval.

**Those URLs carry a `signature` query parameter and will expire.** They are not durable hotlink targets
and must not be referenced from the rebuild.

A **YouTube** embed exists on the product page (18 requests to `www.youtube.com`, and a
`window.onYouTubeIframeAPIReady` hook), so real long-form video uses YouTube while ambient loops use
Vimeo progressive files.

## Analytics, tags and third-party embeds

| Tag                    | Identifier                                                                                                                                            | Fired without consent?                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Google Tag Manager     | `GTM-TXW243R`                                                                                                                                         | yes                                                                                   |
| GA4                    | `G-P8HXZBHNYB` and `G-V39QRYV1VV` (two properties)                                                                                                    | yes, in Consent Mode denied state (`gcs=G100`, `npa=1`)                               |
| Google Tag             | `GT-KTTD9LH`                                                                                                                                          | yes                                                                                   |
| Google Ads conversion  | `AW-11216553712`                                                                                                                                      | yes                                                                                   |
| Google Merchant Center | `MC-QZ735XTHCW`                                                                                                                                       | yes                                                                                   |
| Facebook Pixel         | `148024725039275` (`fbevents.js` v2.9.403)                                                                                                            | yes                                                                                   |
| TikTok Pixel           | via Shopify web pixel → `analytics.tiktok.com`                                                                                                        | yes                                                                                   |
| **HubSpot**            | portal `24455119`                                                                                                                                     | **no** — `<script type="text/plain" data-category="analytics" id="hs-script-loader">` |
| **LinkedIn Insight**   | partner `5772418`                                                                                                                                     | **no** — same `type="text/plain" data-category="analytics"` gating                    |
| Shopify first-party    | trekkie, Web Pixels Manager, `consent-tracking-api`, `monorail-edge`, perf-kit **3.9.2** (`parsed` from the URL path `shopify-perf-kit-3.9.2.min.js`) | yes                                                                                   |

The site runs **Shopify's Cookie Consent Manager in strict mode** — the console logs
`[Shopify Cookie Consent Manager]: Strict mode enabled, disabling all categories by default` and
`All consents updated: {marketing: false, analytics: false, preferences: false, sale_of_data: false}`.
HubSpot and LinkedIn are inert until a category is granted; the Google and Meta tags are not gated that
way and fire immediately with denied consent signals. If the rebuild has a comparable consent posture,
the `type="text/plain"` + `data-category` pattern is the mechanism being used here.

## Conspicuously absent

Things a spec might reasonably assume and should not:

- **Barba.js** — not present at all (see above; the apparent hit is a Croatian street address).
- **jQuery** — zero. Nothing on this site depends on it.
- **ScrollSmoother, Lottie, SplitType, anime.js, AOS, ScrollReveal, Alpine, htmx** — none present.
- **Any pinned ScrollTrigger section** — zero `.pin-spacer` elements across a 58,901 px page.
- **A transform-based scroll container** — the smooth scroll is native; `scrollY` is real.
- **`srcset` / responsive image ladders** — not used.
- **Shopify `_NxN` image suffixes** — not used; query parameters instead.
- **A Theme Store theme** — `Shopify.theme.handle` is `null`.
- **Third-party Shopify apps of consequence** — only Shopify's own web pixels appear.
