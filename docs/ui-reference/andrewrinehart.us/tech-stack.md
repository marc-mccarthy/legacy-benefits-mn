# www.andrewrinehart.us — technology stack

Captured 2026-09-18 from `https://www.andrewrinehart.us/`, viewport 1440×900, headless Chromium
(Playwright 1.61.1) plus `curl`. Confidence levels are `observed` (read off a live object or a response
header), `parsed` (from a URL path or response body), `inferred` (reasoned, with the reasoning stated).

Nothing was downloaded to the repository; bundles were streamed through `grep` and discarded.

**Read the "What actually draws the animated background" section before anything else.** The obvious
answer is wrong, and it is the one thing this site was captured for.

---

## Platform and CMS

**WordPress 7.0.4** — `<meta name="generator" content="WordPress 7.0.4" />`, corroborated by
`link: <https://www.andrewrinehart.us/wp-json/>; rel="https://api.w.org/"` in the response headers and
by `?ver=7.0.4` on every `wp-includes` asset. `xmlrpc.php` is still linked from the head.

**It is a single-page site.** The only internal route in the entire document is `/` — everything else
linked is `wp-json`, `xmlrpc.php` or a feed. Page id 20, `page-template-blank`. Section navigation is
done with full-screen **Divi Overlays** modals rather than pages, which is why the typewriter cycles
"Founder / Venture / Real Estate / Contact" without any of those being URLs.

## Hosting, CDN and edge

**GoDaddy Managed WordPress**, behind Cloudflare. This is settled by four independent signals, not one:

1. An mu-plugin that only GoDaddy installs:
   `/wp-content/mu-plugins/vendor/wpex/godaddy-launch/includes/Dependencies/GoDaddy/Styles/build/latest.css?ver=2.0.2`
2. GoDaddy's asset CDN and telemetry: `img1.wsimg.com/traffic-assets/js/tccl-tti.min.js` →
   `img1.wsimg.com/signals/js/clients/tti/tti.min.js` (7,570 B) and
   `img1.wsimg.com/signals/js/clients/scc-c2/scc-c2.min.js` (21,697 B).
3. GoDaddy's event bus: three `POST`s to `https://csp.secureserver.net/eventbus/web?clientid=…`
   (`secureserver.net` is GoDaddy).
4. GoDaddy's caching proxy headers on every response: `x-gateway-cache-key`, `x-gateway-cache-status`,
   `x-gateway-request-id`, `x-gateway-skip-cache`.

Origin web server is **nginx** — a request for `/wp-content/plugins/*/readme.txt` returns GoDaddy's
nginx 403 page rather than the file, which is also why plugin versions could not be read from readme
headers (see below).

Cloudflare here is GoDaddy's own edge layer, not the owner's account: `server: cloudflare` and `cf-ray`
are present but there is no `nel` / `report-to` block of the kind a directly-configured Cloudflare zone
emits. Caching is aggressive and two-layer — the homepage returned `cf-cache-status: HIT` with
`age: 86204` (≈24 h) and `cache-control: public, max-age=2678400` (31 days), while the GoDaddy layer
reported `x-gateway-cache-status: MISS` on the same request.

## Theme and page builder

|                           | Version               | Confidence | Evidence                                                                                                                                                                          |
| ------------------------- | --------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Divi** (Elegant Themes) | **4.20.2**            | `observed` | Fetched `/wp-content/themes/Divi/style.css` directly: `Theme Name: Divi` / `Version: 4.20.2`. Matches `?ver=4.20.2` on the enqueued theme scripts.                                |
| **Divi Child**            | **4.20.0.1677036222** | `observed` | `/wp-content/themes/Divi-child/style.css` header, and `<meta name="generator" content="Divi Child v.4.20.0.1677036222">`. The header also carries `Updated: 2023-02-22 03:23:42`. |

Body classes confirm the builder is doing the layout, not a hand-written template:
`wp-theme-Divi wp-child-theme-Divi-child et_pb_pagebuilder_layout et_divi_theme et_pb_gutters3
page-template-page-template-blank`.

Worth stating plainly: **Divi 4.20.2 shipped in mid-2023 and the child theme is stamped 2023-02-22.**
This site has not been updated in over three years. Anything copied from it is being copied from a
stale, unpatched page builder.

## What actually draws the animated background

**It is a looping HTML5 video, not particles.** This is the single most important finding on this site
and the easiest to get wrong.

The hero background is a Divi **Section Video Background** module (`et_pb_section_video_bg`, 25
occurrences) containing:

```html
<video loop="loop" autoplay playsinline muted width="1280" height="720">
  <source
    type="video/mp4"
    src=".../wp-content/uploads/2023/02/Technology-888.m4v"
  />
  <source
    type="video/webm"
    src=".../wp-content/uploads/2023/02/Technology-888.webm"
  />
</video>
```

Measured: the `.m4v` is **10,668,985 B (10.2 MiB)** and the `.webm` **6,331,250 B (6.0 MiB)**, both
served straight from `wp-content/uploads` with no transcoding, no adaptive ladder and no poster-frame
fallback. Chromium fetched the `.m4v` with range requests. The `<source type>` declares `video/mp4`
while the server returns `content-type: video/x-m4v` — it works today, but it is a mismatch.

### particles.js is present and does nothing

`particles.js` **v2.0.0** by Vincent Garreau (MIT) is loaded on every page, `parsed` from the verbatim
banner at the top of `/wp-content/plugins/divi-particles/assets/particles.min.js`:

```
/* Author : Vincent Garreau  - vincentgarreau.com
/* v2.0.0
```

That is what `divi-particles` wraps — the original 2015 particles.js, not tsParticles, not a fork. Its
globals leak onto `window` exactly as that library does: `pJS`, `pJSDom`, `particlesJS`, `hexToRgb`,
`clamp`, `isInArray`, `requestAnimFrame`, `cancelRequestAnimFrame`.

**But it never initialises.** At runtime, after load and scrolling:

- `window.pJSDom` is `[]` — an empty array. particles.js pushes one entry per initialised instance.
- `document.querySelectorAll("canvas").length` is `0`. The whole page has no canvas at all.

The reason is in the plugin's own initialiser, `divi-particles.js`, which is a series of guarded blocks:

```js
if (jQuery('body').find('#divi-particles').length > 0) { particlesJS("divi-particles", {…}); }
if (jQuery('body').find('#divi-particles-1').length > 0) { particlesJS("divi-particles-1", {…}); }
```

The only `divi-particles`-prefixed id in the document is `id="divi-particles-js"` — which is
WordPress's own auto-generated id for the `<script>` tag (handle + `-js`), not a container. No target
element exists, so no instance is created. On a one-page site, that means **particles.js is dead code
sitewide**: ~26 KB of JS and a stylesheet fetched on every visit to render nothing.

For completeness, since the rebuild may want the effect anyway: the config the plugin _would_ have used
is the **stock particles.js demo preset, unmodified** — 100 white circles, `line_linked` enabled at
distance 150 / opacity 0.4, `move.speed` 6, `onhover: repulse` (distance 200), `onclick: push` (4
particles), `retina_detect: true`. It even still carries the generator's placeholder
`shape.image.src: "img/github.svg"`.

## JavaScript libraries

| Library           | Version | Confidence | Delivery                                                                                                                     | Role                                                                                                                                   |
| ----------------- | ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| jQuery            | 3.7.1   | `parsed`   | `/wp-includes/js/jquery/jquery.min.js?ver=3.7.1`                                                                             | WordPress core; everything below depends on it                                                                                         |
| jQuery Migrate    | 3.4.1   | `observed` | console logged `JQMIGRATE: Migrate is installed, version 3.4.1`                                                              | Legacy shim, still shipping                                                                                                            |
| particles.js      | 2.0.0   | `parsed`   | `divi-particles/assets/particles.min.js`                                                                                     | **Loaded, never initialised — see above**                                                                                              |
| Typed.js          | 1.1.x   | `inferred` | `divi-typewriter/assets/js/typed.js?ver=1`, 15,615 B unminified                                                              | The rotating "Founder / Venture / Real Estate / Contact" text                                                                          |
| animate.css       | 4.1.1   | `parsed`   | `cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css?ver=4.1.1`, 4,216 B                                        | Overlay entrance — but see the caveat below                                                                                            |
| MediaElement.js   | 4.2.17  | `parsed`   | `/wp-includes/js/mediaelement/*?ver=4.2.17`; runtime globals `mejs`, `MediaElement`, `MediaElementPlayer`, `wp.mediaelement` | WordPress's media player. Enqueued but not driving the background video, which is a bare `<video>`.                                    |
| Waypoints         | —       | `inferred` | Minified inside `Divi/js/scripts.min.js`; `window.Waypoint`, `waypointContextKey`, `et_reinit_waypoint_modules`              | Divi's scroll-animation trigger. `et_animation_data` is `[]` at runtime, so **no Divi scroll animations are configured on this page.** |
| jquery.exitintent | —       | `parsed`   | `divi-overlays/assets/js/jquery.exitintent.js?ver=2.9.7.2`                                                                   | Exit-intent trigger for overlays                                                                                                       |

**Typed.js version reasoning** (no version string in the file): the plugin's front-end initialiser
`typed.fe.js` calls `$(this).typed(options)` — the **jQuery-plugin API**. Typed.js v2.0 removed that
API entirely in favour of `new Typed(el, opts)`. The file also has `typeSpeed`, `backSpeed`, `shuffle`
and `cursorChar` but no `smartBackspace` and no `fadeOut`, both of which are v2 features. That places
it in the v1.1.x line. The copyright banner reads `Typed.js | Copyright (c) 2014 Matt Boldt` (MIT).

**animate.css caveat:** it is loaded, but the document contains only `animate__animated` (twice, on
`.divioverlay-bg`) with **no accompanying effect class** such as `animate__fadeIn`. `animate__animated`
alone sets duration and fill-mode and plays nothing. Like particles.js, it is close to inert.

## Plugins

| Plugin                     | Version     | Confidence | Evidence                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Divi Overlays**          | **2.9.7.2** | `parsed`   | `?ver=2.9.7.2` on all four of its assets (`css/style.css`, `css/custom_animations.css`, `js/custom.js`, `js/jquery.exitintent.js`) and on its generated `et-cache` file. The plugin declares this version to `wp_enqueue_script`, so the query param is meaningful here. |
| **Divi Particles**         | **unknown** | `inferred` | See the warning below                                                                                                                                                                                                                                                    |
| **Divi Typewriter**        | **unknown** | `inferred` | See the warning below                                                                                                                                                                                                                                                    |
| GoDaddy Launch (mu-plugin) | 2.0.2       | `parsed`   | `?ver=2.0.2` on `godaddy-launch/.../Styles/build/latest.css`                                                                                                                                                                                                             |

> **`?ver=7.0.4` on the Divi Particles and Divi Typewriter assets is not those plugins' versions — it
> is WordPress's.** When a plugin passes `false` or omits the version argument to `wp_enqueue_script`,
> WordPress substitutes `$wp_version`. `7.0.4` is the WordPress core version reported by the generator
> meta tag, and it appears identically on `wp-includes/css/dist/components/style.min.css` and
> `wp-mediaelement.min.js`. Divi Typewriter's JS is stamped `?ver=1`, a literal, which is not a version
> either. The real versions of these two plugins cannot be determined from outside: `readme.txt` is
> blocked by nginx with a 403.

`divi-particles` is enqueued with a **doubled slash** in its path —
`/wp-content/plugins/divi-particles//assets/particles.min.js` — which caused a `301` redirect on both
its scripts before they resolved. Two extra round-trips per page load for a library that renders
nothing.

There is also a **404 on every page load**:
`/wp-content/et-cache/44-20/et-custom-divioverlays-44-20-1789602859449.min.css?ver=2.9.7.2` — a stale
Divi cache file referenced in the HTML but no longer on disk.

## Fonts

All fonts are **Google Fonts**, open-licence, safe to adopt or self-host.

| Family        | Delivery                                                                                                                                              | `font-display` | Actually loaded?                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| **Open Sans** | `fonts.googleapis.com/css?family=Open+Sans:300italic,400italic,600italic,700italic,800italic,400,300,600,700,800&subset=latin,latin-ext&display=swap` | `swap`         | **Only 400 normal.** One woff2, 42,964 B, `fonts.gstatic.com/s/opensans/v44/…woff2` |
| **Lato**      | requested in a combined Divi stylesheet, 10 weights + italics                                                                                         | `swap`         | **No** — every face `unloaded` in `document.fonts`                                  |
| **Roboto**    | same combined stylesheet, 9 weights + italics                                                                                                         | `swap`         | **No** — every face `unloaded`                                                      |
| **ETmodules** | `Divi/core/admin/fonts/modules/all/modules.{ttf,woff}`                                                                                                | `block`        | Divi's icon font; `unloaded` on this page                                           |

Computed body stack: `"Open Sans", Arial, sans-serif`.

The waste is worth recording because it is the kind of thing a rebuild inherits by accident. Counted at
runtime from `document.fonts`: **231 declared faces, of which exactly 1 loads.**

| Family    | Declared faces | Loaded |
| --------- | -------------- | ------ |
| Roboto    | 108            | 0      |
| Open Sans | 100            | 1      |
| Lato      | 20             | 0      |
| ETmodules | 3              | 0      |

Lato and Roboto are requested from Google's CSS endpoint on every page view and used for nothing.

Licensing posture is clean — Open Sans, Lato and Roboto are all open-licence (Apache 2.0 / OFL) and may
be self-hosted freely. Nothing on this site presents the problem that ethnocare.ca's commercial faces do.

## Image and video delivery

There is essentially none. **No CDN, no transforms, no responsive delivery:**

- `srcset` appears **0 times** in the document.
- `loading="lazy"` appears **0 times**.
- Every image is a raw PNG from `/wp-content/uploads/` — four of them, all favicons/logo crops.
- The background video is the 10.2 MiB `.m4v` / 6.0 MiB `.webm` pair described above, served from
  `wp-content/uploads` with byte-range requests and no poster image.

Cloudflare caches these (`cf-cache-status: HIT` on the `.m4v`), which is the only thing making the page
tolerable.

## Analytics and third-party embeds

**The site owner runs no analytics at all.** No Google Analytics, no Google Tag Manager, no Meta Pixel,
no LinkedIn, no Hotjar, no consent manager. The only third-party traffic is GoDaddy's own hosting
telemetry:

| What                         | Evidence                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| GoDaddy TTI / traffic beacon | `img1.wsimg.com/signals/js/clients/tti/tti.min.js`; globals `_trfd`, `_trfq`, `trafficScript`, `tti`, `_tcclInternal` |
| GoDaddy SCC-C2               | `img1.wsimg.com/signals/js/clients/scc-c2/scc-c2.min.js` (21,697 B); global `scc-c2`                                  |
| GoDaddy event bus            | 3× `POST https://csp.secureserver.net/eventbus/web?clientid=…` (202 responses)                                        |
| GoDaddy data layers          | globals `_expDataLayer`, `_signalsDataLayer`                                                                          |

Total distinct third-party hosts contacted: **four** (`img1.wsimg.com`, `csp.secureserver.net`,
`fonts.googleapis.com`/`fonts.gstatic.com`, `cdnjs.cloudflare.com`). Against ethnocare.ca's sixteen,
that is a materially different privacy footprint, and it is worth knowing which of the two the Medicare
site should resemble.

## Conspicuously absent

- **Any canvas element.** Zero, on the only page. See the particles.js finding.
- **GSAP, Lenis, Locomotive, Barba, ScrollTrigger, three.js, Swiper** — none of them. This site's
  motion vocabulary is: one looping video, one typewriter, CSS transitions, and Divi's Waypoints-based
  reveal system (which is configured with no animations).
- **Any Divi scroll animation.** `window.et_animation_data` is `[]`.
- **Any Divi link-options data.** `window.et_link_options_data` is `[]`.
- **Analytics of the owner's own.** None.
- **A build step.** Everything is unminified plugin source served directly; `typed.js` is shipped
  unminified at 15,615 B.
- **More than one page.** The nav is modals, not routes.
