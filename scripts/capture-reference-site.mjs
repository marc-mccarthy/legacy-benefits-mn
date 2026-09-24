/**
 * Requirements:
 * - Capture two live reference sites in enough forensic detail that a UI/motion specification can be
 *   written from the artifacts alone, by someone who never opens the sites.
 * - Measure, never describe. Every number in every output file is read from a live page in the run
 *   that wrote it.
 * - Download nothing. No third-party image, video, webfont or script byte is ever written to disk.
 *   Third-party assets are catalogued by URL, intrinsic size, rendered rect and transfer size, and
 *   every entry carries `downloaded: false`. Our own screenshots and our own JSON are the only files
 *   this script creates.
 * - Verify the committed tree without a network or a browser, so a check can run anywhere.
 *
 *   node scripts/capture-reference-site.mjs                      # capture both sites
 *   node scripts/capture-reference-site.mjs --site ethnocare.ca  # capture one site
 *   node scripts/capture-reference-site.mjs --clean              # delete each site dir first
 *   node scripts/capture-reference-site.mjs --check              # verify the committed tree, no network
 *
 * ## The import that will otherwise cost you an hour
 *
 *   import { chromium, devices } from "@playwright/test";
 *
 * `import { chromium } from "playwright"` returns MODULE_NOT_FOUND in this repository. pnpm's strict
 * node_modules layout leaves `playwright` and `playwright-core` inside `node_modules/.pnpm/` only,
 * unhoisted, so the bare specifier does not resolve. `@playwright/test` is a real top-level
 * devDependency and re-exports the entire library API, including `chromium` and `devices`.
 *
 * Using the library API also means `playwright.config.ts` is never read, so its `webServer` — a full
 * `pnpm build && pnpm start` Next.js production build with a 240s timeout — never runs. That is the
 * reason this is a plain `.mjs` under `scripts/` driven by bare `node`, and not a spec under `e2e/`.
 * Do not "fix" either of these back.
 *
 * ## Known failure modes
 *
 * - Under a command sandbox, headless Chrome cannot register a Mach port and dies with
 *   `bootstrap_check_in ... Permission denied (1100)`, which reads like a broken browser install and
 *   is not one. The same sandbox blocks all external network. Capture must run unsandboxed;
 *   `--check` touches neither a browser nor a network and is safe anywhere.
 * - `page.screenshot({ fullPage: true })` silently truncates when `scrollHeight * deviceScaleFactor`
 *   exceeds Chromium's 16384px maximum texture height. The ethnocare home route measured 56821 CSS
 *   px tall in this run, which is 113642 device px at dpr 2 — nearly seven times the ceiling. Tall
 *   routes are therefore captured as overlapping JPEG bands with `banded: true` and explicit offsets.
 * - `response.text()` throws for a body Chromium has already discarded. An unguarded throw inside a
 *   `context.on("response")` listener kills the listener and silently loses the rest of the network
 *   log, so every body read is wrapped and size-capped.
 * - Cross-origin stylesheets throw SecurityError on `.cssRules`. Shopify's CDN and Google Fonts both
 *   do. Each failure is recorded as STYLESHEET_CORS and the sheet is refetched with
 *   `page.request.get()`, which reuses the context's cookies and is not subject to the CSSOM
 *   same-origin rule, then parsed as text in Node.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { chromium, devices } from "@playwright/test";

const root = resolve(import.meta.dirname, "..");
const outRoot = resolve(root, "docs", "ui-reference");

const CHECK = process.argv.includes("--check");
const CLEAN = process.argv.includes("--clean");
const siteArgIndex = process.argv.indexOf("--site");
const ONLY_SITE = siteArgIndex === -1 ? null : process.argv[siteArgIndex + 1];

/**
 * Viewports, chosen against the targets' own declared breakpoints rather than against generic
 * device names.
 *
 * ethnocare.ca publishes its entire breakpoint ladder on `window.config.BREAKPOINTS`, read live in
 * the Stage 1 recon of this pass: FROM_TINY 500, FROM_SMALL 700, FROM_MEDIUM 1000, FROM_LARGE 1200,
 * FROM_BIG 1400, FROM_HUGE 1600, FROM_ENORMOUS 1800, FROM_GIGANTIC 2000, FROM_COLOSSAL 2400. The
 * four widths below land one inside each band that matters: 1600 is exactly FROM_HUGE, 1440 sits in
 * the BIG band, 834 in the SMALL band, 390 in the sub-TINY band.
 *
 * Divi's stock ladder on www.andrewrinehart.us is 1405 / 1100 / 980 / 767 / 479, so the same four
 * widths also straddle every Divi boundary: 1600 > 1405, 1440 > 1405 (but a different grid band),
 * 834 lands between 767 and 980, and 390 is below 479.
 */
const VIEWPORTS = [
  { name: "wide", width: 1600, height: 1000, dpr: 2, isMobile: false },
  { name: "desktop", width: 1440, height: 900, dpr: 2, isMobile: false },
  { name: "tablet", width: 834, height: 1112, dpr: 2, isMobile: false },
  { name: "mobile", width: 390, height: 844, dpr: 3, isMobile: true },
];

const FULL_VIEWPORTS = new Set(["desktop", "mobile"]);

/**
 * The durable record of what was captured and why those routes.
 *
 * `sections` is the Stage 1 recon table: each entry names a real component block observed in the
 * live DOM with the MCP browser before this script existed. Selectors are the theme's own BEM block
 * names, which is what makes them stable — ethnocare's markup is machine-generated by Shopify and
 * every id contains a template hash (`shopify-section-template--18961612439871__product-proxy`)
 * that will change the next time the theme is saved. The `c-` classes will not.
 */
const SITES = {
  "ethnocare.ca": {
    origin: "https://ethnocare.ca",
    label: "Ethnocare — Shopify storefront, prosthetic covers",
    routes: [
      { slug: "home", path: "/", scrollFrames: { desktop: 16, mobile: 10 } },
      { slug: "about-us", path: "/pages/about-us" },
      { slug: "academy", path: "/pages/academy" },
      { slug: "underlay", path: "/pages/underlay" },
      { slug: "reimbursement", path: "/pages/reimbursement" },
      { slug: "support", path: "/pages/support" },
      { slug: "accessories", path: "/collections/accessories" },
      {
        slug: "product-overlay-transtibial",
        path: "/products/overlay-transtibial",
      },
      { slug: "blog-news", path: "/blogs/news" },
    ],
    // Recon table: section slug -> selector. Confirmed present on the home route in this pass.
    sections: [
      { slug: "section-3d", selector: ".c-section-3d" },
      { slug: "push-products", selector: ".c-push-products" },
      { slug: "images-sequence", selector: ".c-images-sequence" },
      { slug: "quote", selector: ".c-quote" },
      { slug: "fadein-text", selector: ".c-fadein-text" },
      { slug: "specifications", selector: ".c-specifications" },
      { slug: "carousel-circular", selector: ".c-carousel-circular" },
      { slug: "card-cta", selector: ".c-card-cta" },
      { slug: "hero", selector: ".c-hero" },
      { slug: "rail", selector: ".c-rail" },
      { slug: "tile-page-push", selector: ".c-tile-page-push" },
      { slug: "pre-footer", selector: ".c-pre-footer" },
      { slug: "footer", selector: ".c-footer" },
    ],
    chrome: {
      header: "header.c-header",
      navToggle: "button.c-header_menu",
      navPanel: ".c-modal-menu",
      primaryCta: "a.c-button.c-header_animate",
      card: ".c-card-cta",
      productDropdown: "button.c-product-dropdown_toggler",
      signatureEffect: ".c-gradient canvas",
    },
    // Hover/focus targets whose computed-style delta is worth measuring.
    stateTargets: [
      { slug: "nav-link", selector: "a.c-button.c-header_animate" },
      { slug: "hover-underline", selector: ".u-hover-underline" },
      { slug: "card-cta", selector: ".c-card-cta" },
      { slug: "footer-link", selector: ".c-footer a" },
    ],
    // Smooth scroll: html carries `lenis lenis-smooth`, and 37 elements carry Locomotive's
    // `data-scroll*` attribute vocabulary, but there is no [data-scroll-container] and html
    // overflow computes to `visible` with a real 56820px body height. That combination is
    // locomotive-scroll v5, which delegates smooth scrolling to Lenis and leaves native document
    // flow intact. Teardown therefore only has to strip classes, not undo a container transform.
    smoothScroll: "lenis",
    transitions: [
      {
        from: "/",
        to: "/pages/about-us",
        link: 'header a[href="/pages/about-us"]',
      },
      {
        from: "/pages/about-us",
        to: "/pages/academy",
        link: 'header a[href="/pages/academy"]',
      },
      {
        from: "/",
        to: "/collections/accessories",
        link: 'header a[href="/collections/accessories"]',
      },
      {
        from: "/collections/accessories",
        to: "/products/overlay-transtibial",
        link: 'main a[href*="/products/"]',
      },
    ],
    effects: { video: true, imageSequence: true, webglGradient: true },
  },

  "www.andrewrinehart.us": {
    origin: "https://www.andrewrinehart.us",
    label:
      "Andrew Rinehart — WordPress 7.0.4 + Divi 4.20.2 child theme, behind Cloudflare",
    routes: [
      { slug: "home", path: "/", scrollFrames: { desktop: 4, mobile: 4 } },
    ],
    sections: [
      { slug: "video-hero", selector: ".et_pb_section_video" },
      { slug: "builder-row", selector: ".et_pb_row" },
      { slug: "typewriter", selector: ".typed-me" },
    ],
    chrome: {
      header: null,
      navToggle: null,
      navPanel: "#overlay_unique_id_44",
      primaryCta: ".typed-me",
      card: null,
      signatureEffect: ".et_pb_section_video_bg video",
    },
    stateTargets: [{ slug: "typewriter", selector: ".typed-me" }],
    smoothScroll: "none",
    transitions: [],
    effects: { video: true, particles: true, typewriter: true },
    // Divi Particles ships one static file containing five identical particlesJS() calls, each
    // guarded on an element id that does not exist in this site's markup. See captureParticles().
    particlesScript:
      "/wp-content/plugins/divi-particles//assets/divi-particles.js?ver=7.0.4",
  },
};

const MAX_TEXTURE_PX = 16384;
const BAND_CSS_PX = 6000;
const MAX_BANDS = 14;
const BODY_READ_CAP = 2 * 1024 * 1024;
// Sections on ethnocare.ca are scroll-driven and enormous — .c-images-sequence measured 16748px on
// the home route. Past a couple of viewports the extra height is the same sticky element repeated,
// so the shot is clipped and the scroll-frame sequence carries the motion instead.
const SECTION_CLIP_PX = 3200;

const sha256File = (path) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

const rel = (path) => relative(root, path).split("\\").join("/");

function writeJson(path, value) {
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

// ---------------------------------------------------------------------------
// Browser-side probes. Each is a plain function serialised into the page, so it
// may not close over anything in this module.
// ---------------------------------------------------------------------------

/**
 * Runs before any of the site's own scripts. Three jobs, all of which are impossible to do after
 * load: neutralise autoplay so a seeked video frame is deterministic, patch IntersectionObserver so
 * the site's own observers can be enumerated (there is no API to list existing ones), and install
 * the class-flip recorder that measures reveal thresholds empirically.
 */
const INIT_SCRIPT = `
(() => {
  window.__forensics = { observers: [], reveals: [], classFlips: 0, mediaPlayBlocked: 0 };

  // Autoplay off. A video that has already played four seconds decodes a different frame than one
  // seeked from cold, which makes the two frames we take per video non-reproducible.
  try {
    const realPlay = HTMLMediaElement.prototype.play;
    window.__realPlay = function () { return realPlay.apply(this, arguments); };
    HTMLMediaElement.prototype.play = function () {
      window.__forensics.mediaPlayBlocked++;
      return Promise.resolve();
    };
  } catch (e) {}

  // IntersectionObserver census. Must be installed before the site constructs any.
  try {
    const Real = window.IntersectionObserver;
    if (Real) {
      const Patched = function (cb, opts) {
        try {
          window.__forensics.observers.push({
            root: opts && opts.root ? (opts.root.tagName || 'element') : null,
            rootMargin: (opts && opts.rootMargin) || '0px 0px 0px 0px',
            threshold: opts && opts.threshold !== undefined ? opts.threshold : 0,
            stack: (new Error().stack || '').split('\\n').slice(2, 5).join(' | ').slice(0, 300)
          });
        } catch (e) {}
        return new Real(cb, opts);
      };
      Patched.prototype = Real.prototype;
      window.IntersectionObserver = Patched;
    }
  } catch (e) {}

  // Empirical reveal detector. Locomotive computes in-view state in its own rAF loop and never
  // constructs an IntersectionObserver, so the constructor patch above sees nothing for it. This
  // records the class flip itself, with the scroll position and the element's viewport-relative
  // top at the instant it fired, which is the number a reveal threshold is written from.
  const REVEAL = /(^|\\s)(is-inview|is-visible|is-active|is-revealed|-lazy-loaded|is-loaded|is-ready|et-animated|et_animated)(\\s|$)/;
  window.__startReveals = () => {
    if (window.__revealObserver) return;
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type !== 'attributes') continue;
        const el = r.target;
        if (!(el instanceof Element)) continue;
        const now = el.getAttribute(r.attributeName) || '';
        const before = r.oldValue || '';
        if (r.attributeName === 'class' && !REVEAL.test(now)) continue;
        if (now === before) continue;
        window.__forensics.classFlips++;
        if (window.__forensics.reveals.length >= 400) continue;
        let rect;
        try { rect = el.getBoundingClientRect(); } catch (e) { continue; }
        if (rect.height === 0 && rect.width === 0) continue;
        const gained = r.attributeName === 'class'
          ? now.split(/\\s+/).filter((c) => c && !before.split(/\\s+/).includes(c))
          : [];
        window.__forensics.reveals.push({
          attr: r.attributeName,
          selector: (el.tagName || '').toLowerCase() +
            (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\\s+/).slice(0, 3).join('.')
              : ''),
          gained: gained.slice(0, 4),
          scrollY: Math.round(window.scrollY),
          rectTop: Math.round(rect.top),
          rectHeight: Math.round(rect.height),
          viewportFraction: Number((rect.top / window.innerHeight).toFixed(4)),
          t: Math.round(performance.now())
        });
      }
    });
    mo.observe(document.documentElement, {
      subtree: true, attributes: true, attributeOldValue: true,
      attributeFilter: ['class', 'style']
    });
    window.__revealObserver = mo;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.__startReveals(), { once: true });
  } else {
    window.__startReveals();
  }

  // Overlay suppression, seeded before the consent scripts read storage.
  try {
    const seed = {
      'cookie_consent': 'true', 'cookieconsent_status': 'dismiss', 'cc_cookie': '{"level":["necessary"]}',
      'consent': 'true', 'gdpr-accepted': 'true', 'newsletter-dismissed': 'true',
      'divi-overlay-shown': '1', 'et_overlay_shown': '1'
    };
    for (const k of Object.keys(seed)) { try { localStorage.setItem(k, seed[k]); } catch (e) {} }
  } catch (e) {}
})();
`;

/**
 * Tears smooth scroll down and restores native document flow, then proves it worked.
 *
 * Returns the assertion result rather than throwing, because the caller has to decide between
 * skipping a full-page screenshot and emitting a viewport-height image labelled `fullpage`. The
 * second is the failure this function exists to prevent.
 */
const TEARDOWN_SMOOTH_SCROLL = `(() => {
  const before = {
    htmlClass: document.documentElement.className,
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight
  };

  // 1. Destroy any reachable instance. Neither library exposes one on this run's targets — both are
  //    bundled as ES modules with no global — so this is best-effort and the DOM work below is what
  //    actually does the job.
  for (const key of ['__lenis', 'lenis', '__loco', 'locomotive', 'scroll', 'LocomotiveScroll']) {
    try {
      const inst = window[key];
      if (inst && typeof inst.destroy === 'function') inst.destroy();
    } catch (e) {}
  }

  // 2. Strip the classes that put the document into smooth-scroll mode. destroy() removes listeners
  //    and leaves these behind.
  for (const c of ['has-scroll-smooth', 'has-scroll-init', 'has-scroll-dragging', 'lenis', 'lenis-smooth', 'lenis-scrolling', 'lenis-stopped']) {
    document.documentElement.classList.remove(c);
    document.body.classList.remove(c);
  }

  // 3. Clear the container's final transform. Locomotive v4 leaves it applied after destroy().
  for (const el of document.querySelectorAll('[data-scroll-container]')) {
    el.style.transform = 'none';
    el.style.height = 'auto';
    el.style.position = 'static';
  }

  // 4. Force document flow back on.
  const force = 'overflow: auto !important; height: auto !important; position: static !important;';
  document.documentElement.setAttribute('style',
    (document.documentElement.getAttribute('style') || '') + ';' + force);
  document.body.setAttribute('style',
    (document.body.getAttribute('style') || '') + ';' + force);

  // 5. Prove it.
  const after = {
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight
  };
  return {
    before, after,
    ok: after.scrollHeight > after.innerHeight * 1.2,
    ratio: Number((after.scrollHeight / after.innerHeight).toFixed(2))
  };
})()
`;

/**
 * The freeze stylesheet. Injected only after the motion extract has been taken, because a freeze
 * applied first makes `getComputedStyle` report every transition as `0s` and the extract then
 * faithfully records a page with no motion in it.
 */
const FREEZE_CSS = `
*, *::before, *::after {
  animation-duration: 0s !important;
  animation-delay: 0s !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0s !important;
  transition-delay: 0s !important;
  caret-color: transparent !important;
}
.typed-cursor { opacity: 1 !important; }
`;

// ---------------------------------------------------------------------------
// The extractor. One page.evaluate, returning the whole design-system record.
// ---------------------------------------------------------------------------

// NB: this and TEARDOWN_SMOOTH_SCROLL are both immediately-invoked. `page.evaluate` given a *string*
// evaluates it as an expression and does not call it, so a bare `() => {...}` string evaluates to a
// function object, which is unserialisable, and the caller silently receives `undefined`. That
// presents as `Cannot read properties of undefined` at the first property access on the result and
// looks nothing like the actual cause. Only a real JS function argument is auto-invoked.
const EXTRACT = `(async () => {
  const warnings = [];
  const out = { warnings };

  const norm = (v) => (v == null ? '' : String(v).trim());
  const round = (n, d = 2) => Number(Number(n).toFixed(d));

  // --- colour normalisation -------------------------------------------------
  const toHex = (value) => {
    const v = norm(value);
    if (!v || v === 'none' || v === 'transparent') return null;
    let m = v.match(/^rgba?\\(([^)]+)\\)$/i);
    if (m) {
      const parts = m[1].split(/[\\s,\\/]+/).filter(Boolean).map(Number);
      if (parts.length >= 3) {
        if (parts.length === 4 && parts[3] === 0) return null;
        const h = parts.slice(0, 3)
          .map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'))
          .join('');
        return '#' + h.toUpperCase();
      }
    }
    if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) {
      let hex = v.slice(1);
      if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
      if (hex.length === 8) { if (parseInt(hex.slice(6), 16) === 0) return null; hex = hex.slice(0, 6); }
      return '#' + hex.toUpperCase();
    }
    // oklch() / color(srgb ...) and anything else exotic: resolve through the engine.
    try {
      const probe = document.createElement('span');
      probe.style.color = v;
      if (!probe.style.color) return null;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      if (resolved && resolved !== v) return toHex(resolved);
    } catch (e) {}
    return null;
  };

  const relLum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => {
    const la = relLum(a), lb = relLum(b);
    return round((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05), 2);
  };

  // --- stylesheet walk ------------------------------------------------------
  const declared = {};
  const mediaTally = {};
  const keyframes = {};
  const fontFaceRules = [];
  const corsSheets = [];
  let ruleCount = 0;

  const addMedia = (condition, n) => {
    const key = norm(condition);
    if (!key) return;
    mediaTally[key] = (mediaTally[key] || 0) + n;
  };

  const walkRules = (rules, source) => {
    for (const r of rules) {
      ruleCount++;
      if (r.type === 4 || r.constructor.name === 'CSSMediaRule') {
        let inner = 0;
        try { inner = r.cssRules ? r.cssRules.length : 0; } catch (e) {}
        addMedia(r.conditionText || r.media?.mediaText, inner || 1);
        try { if (r.cssRules) walkRules(r.cssRules, source); } catch (e) {}
        continue;
      }
      // CSSSupportsRule and @layer both nest, and real @media rules hide inside them.
      if (r.cssRules && (r.constructor.name === 'CSSSupportsRule' || r.constructor.name === 'CSSLayerBlockRule' || r.type === 12)) {
        try { walkRules(r.cssRules, source); } catch (e) {}
        continue;
      }
      if (r.constructor.name === 'CSSKeyframesRule' || r.type === 7) {
        const frames = [];
        try {
          for (const kf of r.cssRules) {
            const decl = {};
            for (const p of kf.style) decl[p] = kf.style.getPropertyValue(p).trim();
            frames.push({ offset: kf.keyText, declarations: decl });
          }
        } catch (e) {}
        if (!keyframes[r.name]) keyframes[r.name] = { name: r.name, source, frames };
        continue;
      }
      if (r.constructor.name === 'CSSFontFaceRule' || r.type === 5) {
        const f = {};
        try { for (const p of r.style) f[p] = r.style.getPropertyValue(p).trim(); } catch (e) {}
        fontFaceRules.push({ source, ...f });
        continue;
      }
      if (r.selectorText && /(^|,\\s*)(:root|html|body)\\b/.test(r.selectorText)) {
        try {
          for (const p of r.style) {
            if (p.startsWith('--')) declared[p] = r.style.getPropertyValue(p).trim();
          }
        } catch (e) {}
      }
    }
  };

  for (const sheet of document.styleSheets) {
    let rules = null;
    try { rules = sheet.cssRules; } catch (e) {
      corsSheets.push(sheet.href || '(inline)');
      continue;
    }
    if (rules) walkRules(rules, sheet.href || 'inline');
  }
  out.stylesheetCors = corsSheets;
  out.ruleCount = ruleCount;

  // --- custom properties: declared intent vs resolved value -----------------
  const rootStyle = getComputedStyle(document.documentElement);
  const resolved = {};
  for (const name of Object.keys(declared)) resolved[name] = rootStyle.getPropertyValue(name).trim();
  out.customProperties = { declared, resolved, count: Object.keys(declared).length };

  // --- typography -----------------------------------------------------------
  // measureCh through canvas against the element's own computed font shorthand. The
  // width / (fontSize * 0.5) approximation is wrong by 15-20% on a condensed face, and typographic
  // measure is a first-class spec number.
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const chWidth = (cs) => {
    try {
      ctx.font = cs.font && cs.font !== '' ? cs.font
        : (cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily);
      const w = ctx.measureText('0').width;
      return w > 0 ? round(w, 3) : null;
    } catch (e) { return null; }
  };

  const ROLE_SELECTORS = [
    ['h1', 'h1'], ['h2', 'h2'], ['h3', 'h3'], ['h4', 'h4'], ['h5', 'h5'], ['h6', 'h6'],
    ['body', 'body'], ['paragraph', 'p'], ['link', 'a'],
    ['button', 'button, .c-button, .et_pb_button'], ['small', 'small, .c-text-small'],
    ['eyebrow', '.c-heading-extended, .et_pb_text_inner > span'],
    ['blockquote', 'blockquote, .c-quote'],
    ['nav-item', 'header a, nav a'],
    ['display', '.c-heading, .typed-me']
  ];

  const typography = [];
  for (const [role, sel] of ROLE_SELECTORS) {
    let el = null;
    try {
      for (const cand of document.querySelectorAll(sel)) {
        const r = cand.getBoundingClientRect();
        if (r.width > 4 && r.height > 4 && norm(cand.textContent)) { el = cand; break; }
      }
    } catch (e) { continue; }
    if (!el) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const rootFont = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const size = parseFloat(cs.fontSize);
    const lh = cs.lineHeight === 'normal' ? null : parseFloat(cs.lineHeight);
    const ls = cs.letterSpacing === 'normal' ? 0 : parseFloat(cs.letterSpacing);
    const ch = chWidth(cs);
    typography.push({
      role,
      selector: sel,
      sample: norm(el.textContent).replace(/\\s+/g, ' ').slice(0, 60),
      fontFamily: cs.fontFamily,
      resolvedFamily: cs.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      fontSizePx: round(size),
      fontSizeRem: round(size / rootFont, 4),
      lineHeightPx: lh === null ? null : round(lh),
      lineHeightRatio: lh === null ? null : round(lh / size, 3),
      letterSpacingPx: round(ls, 3),
      letterSpacingEm: round(ls / size, 4),
      textTransform: cs.textTransform,
      color: toHex(cs.color),
      marginTopPx: round(parseFloat(cs.marginTop)),
      marginBottomPx: round(parseFloat(cs.marginBottom)),
      maxWidth: cs.maxWidth,
      renderedWidthPx: round(rect.width),
      measureChWidthPx: ch,
      measureCh: ch ? round(rect.width / ch, 1) : null,
      textWrap: cs.textWrap || null
    });
  }
  out.typography = typography;

  // --- font faces -----------------------------------------------------------
  // document.fonts carries family/weight/style/unicodeRange but not a usable src; the
  // CSSFontFaceRule carries src but the set is the authority on what actually loaded. Cross-join.
  const loadedFaces = [];
  try {
    document.fonts.forEach((f) => loadedFaces.push({
      family: f.family, weight: f.weight, style: f.style,
      stretch: f.stretch, unicodeRange: f.unicodeRange, status: f.status, display: f.display
    }));
  } catch (e) {}
  const OPEN_HOSTS = /(fonts\\.gstatic\\.com|fonts\\.googleapis\\.com)/i;
  out.fontFaces = loadedFaces.map((f) => {
    const rule = fontFaceRules.find((r) =>
      norm(r['font-family']).replace(/["']/g, '') === f.family &&
      (!r['font-weight'] || norm(r['font-weight']) === norm(f.weight))
    );
    const src = rule ? rule.src : null;
    const urls = src ? [...src.matchAll(/url\\(([^)]+)\\)/g)].map((m) => m[1].replace(/["']/g, '')) : [];
    return {
      ...f,
      src: src || null,
      urls,
      downloaded: false,
      licensedThirdParty: urls.length > 0 && !urls.every((u) => OPEN_HOSTS.test(u)) && !urls.every((u) => u.startsWith('data:'))
    };
  });
  out.fontFaceRuleCount = fontFaceRules.length;

  // --- colours --------------------------------------------------------------
  const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor',
    'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke'];
  const colorTally = {};
  const gradients = {};
  const contrastPairs = [];
  let elementsWalked = 0;

  for (const el of document.querySelectorAll('*')) {
    elementsWalked++;
    if (elementsWalked > 12000) break;
    let cs;
    try { cs = getComputedStyle(el); } catch (e) { continue; }
    const rect = el.getBoundingClientRect();
    const area = Math.max(0, rect.width) * Math.max(0, rect.height);
    for (const prop of PROPS) {
      const hex = toHex(cs[prop]);
      if (!hex) continue;
      const entry = colorTally[hex] || (colorTally[hex] = { hex, frequency: 0, largestAreaPx2: 0, properties: {} });
      entry.frequency++;
      entry.properties[prop] = (entry.properties[prop] || 0) + 1;
      // Area is only meaningful for a fill of the box, not for a 1px border.
      if ((prop === 'backgroundColor' || prop === 'fill') && area > entry.largestAreaPx2) {
        entry.largestAreaPx2 = Math.round(area);
      }
    }
    const bgi = cs.backgroundImage;
    if (bgi && bgi !== 'none' && /gradient/i.test(bgi)) {
      const key = bgi.slice(0, 260);
      gradients[key] = (gradients[key] || 0) + 1;
    }
    // Contrast, only where there is real text on a real background.
    if (area > 400 && norm(el.textContent) && el.children.length === 0) {
      const fg = toHex(cs.color);
      let bgEl = el, bg = null;
      for (let i = 0; i < 8 && bgEl; i++) {
        const c = toHex(getComputedStyle(bgEl).backgroundColor);
        if (c) { bg = c; break; }
        bgEl = bgEl.parentElement;
      }
      if (fg && bg && contrastPairs.length < 60) {
        const ratio = contrast(fg, bg);
        const size = parseFloat(cs.fontSize);
        const large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
        if (!contrastPairs.some((p) => p.foreground === fg && p.background === bg)) {
          contrastPairs.push({
            foreground: fg, background: bg, ratio,
            fontSizePx: round(size), large,
            passesAA: large ? ratio >= 3 : ratio >= 4.5,
            passesAAA: large ? ratio >= 4.5 : ratio >= 7,
            sample: norm(el.textContent).replace(/\\s+/g, ' ').slice(0, 40)
          });
        }
      }
    }
  }
  out.colors = Object.values(colorTally)
    .sort((a, b) => b.largestAreaPx2 - a.largestAreaPx2 || b.frequency - a.frequency)
    .slice(0, 60);
  out.gradients = Object.entries(gradients).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([value, count]) => ({ value, count }));
  out.contrastPairs = contrastPairs;
  out.elementsWalked = elementsWalked;

  // --- spacing --------------------------------------------------------------
  const pad = {}, gaps = {}, radii = {}, containers = {};
  const bump = (bag, key) => { if (key && key !== '0px') bag[key] = (bag[key] || 0) + 1; };
  const SECTION_SEL = 'section, .c-section-3d, .c-quote, .c-fadein-text, .c-images-sequence, .c-push-products, .c-pre-footer, .c-footer, .et_pb_section, .et_pb_row, [class*="section"]';
  for (const el of document.querySelectorAll(SECTION_SEL)) {
    const cs = getComputedStyle(el);
    bump(pad, cs.paddingTop + ' / ' + cs.paddingBottom);
    if (cs.display.includes('grid') || cs.display.includes('flex')) {
      bump(gaps, cs.rowGap + ' / ' + cs.columnGap);
    }
    const r = el.getBoundingClientRect();
    if (r.width > 200) bump(containers, cs.maxWidth + ' @ ' + Math.round(r.width) + 'px');
  }
  let radiiWalked = 0;
  for (const el of document.querySelectorAll('*')) {
    if (radiiWalked++ > 4000) break;
    const br = getComputedStyle(el).borderRadius;
    bump(radii, br);
  }
  const sorted = (bag) => Object.entries(bag).sort((a, b) => b[1] - a[1]).slice(0, 20)
    .map(([value, count]) => ({ value, count }));
  out.spacing = {
    sectionPadding: sorted(pad),
    gridGaps: sorted(gaps),
    borderRadii: sorted(radii),
    containers: sorted(containers),
    rootFontSizePx: round(parseFloat(getComputedStyle(document.documentElement).fontSize))
  };

  // --- motion ---------------------------------------------------------------
  // transition-* are parallel comma-lists of independent length; zip them rather than assuming one
  // entry each. Group by fingerprint: a raw per-element dump on a Shopify page is tens of thousands
  // of identical rows.
  const motionTally = {};
  const animTally = {};
  let motionWalked = 0;
  for (const el of document.querySelectorAll('*')) {
    if (motionWalked++ > 12000) break;
    let cs;
    try { cs = getComputedStyle(el); } catch (e) { continue; }
    const props = cs.transitionProperty.split(',').map((s) => s.trim());
    const durs = cs.transitionDuration.split(',').map((s) => s.trim());
    const fns = cs.transitionTimingFunction.split(/,(?![^(]*\\))/).map((s) => s.trim());
    const delays = cs.transitionDelay.split(',').map((s) => s.trim());
    for (let i = 0; i < props.length; i++) {
      const property = props[i];
      const duration = durs[i % durs.length] || '0s';
      if (duration === '0s' && property === 'all') continue;
      if (duration === '0s') continue;
      const timing = fns[i % fns.length] || 'ease';
      const delay = delays[i % delays.length] || '0s';
      const key = property + '|' + duration + '|' + timing + '|' + delay;
      const e = motionTally[key] || (motionTally[key] = {
        property, duration, timingFunction: timing, delay, instanceCount: 0, representativeSelector: null
      });
      e.instanceCount++;
      if (!e.representativeSelector) {
        e.representativeSelector = (el.tagName || '').toLowerCase() +
          (typeof el.className === 'string' && el.className.trim()
            ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
      }
    }
    const names = cs.animationName.split(',').map((s) => s.trim()).filter((n) => n && n !== 'none');
    if (names.length) {
      const adurs = cs.animationDuration.split(',').map((s) => s.trim());
      const afns = cs.animationTimingFunction.split(/,(?![^(]*\\))/).map((s) => s.trim());
      const aits = cs.animationIterationCount.split(',').map((s) => s.trim());
      const adels = cs.animationDelay.split(',').map((s) => s.trim());
      names.forEach((name, i) => {
        const key = name + '|' + (adurs[i % adurs.length] || '');
        const e = animTally[key] || (animTally[key] = {
          name,
          duration: adurs[i % adurs.length] || '0s',
          timingFunction: afns[i % afns.length] || 'ease',
          iterationCount: aits[i % aits.length] || '1',
          delay: adels[i % adels.length] || '0s',
          instanceCount: 0,
          keyframes: keyframes[name] ? keyframes[name].frames : null,
          keyframesSource: keyframes[name] ? keyframes[name].source : 'NOT_RESOLVED'
        });
        e.instanceCount++;
      });
    }
  }
  out.motion = {
    transitions: Object.values(motionTally).sort((a, b) => b.instanceCount - a.instanceCount).slice(0, 60),
    animations: Object.values(animTally).sort((a, b) => b.instanceCount - a.instanceCount).slice(0, 40),
    keyframesDefined: Object.keys(keyframes).length,
    keyframesNames: Object.keys(keyframes).slice(0, 60),
    prefersReducedMotionHonoured: Object.keys(mediaTally).some((m) => /prefers-reduced-motion/i.test(m)),
    reducedMotionRules: Object.entries(mediaTally).filter(([m]) => /prefers-reduced-motion/i.test(m))
      .map(([condition, count]) => ({ condition, count }))
  };

  // --- breakpoints ----------------------------------------------------------
  const bpTally = {};
  for (const [condition, count] of Object.entries(mediaTally)) {
    for (const m of condition.matchAll(/\\((min|max)-width:\\s*([\\d.]+)(px|em|rem)\\)/g)) {
      const raw = parseFloat(m[2]);
      const px = m[3] === 'px' ? raw : Math.round(raw * 16);
      const key = m[1] + '-width:' + px + 'px';
      const e = bpTally[key] || (bpTally[key] = { type: m[1], px, ruleCount: 0, originalUnit: m[3] });
      e.ruleCount += count;
    }
  }
  out.breakpoints = Object.values(bpTally).sort((a, b) => b.ruleCount - a.ruleCount);
  out.mediaConditions = Object.entries(mediaTally).sort((a, b) => b[1] - a[1]).slice(0, 40)
    .map(([condition, ruleCount]) => ({ condition, ruleCount }));

  // --- libraries ------------------------------------------------------------
  const libs = [];
  const seenLib = new Set();
  const addLib = (name, version, detectedVia, extra) => {
    const key = name + '|' + detectedVia;
    if (seenLib.has(key)) return;
    seenLib.add(key);
    libs.push({ name, version: version || null, detectedVia, ...(extra || {}) });
  };
  // 1. runtime globals
  const GLOBALS = {
    barba: 'Barba.js', Barba: 'Barba.js', gsap: 'GSAP', ScrollTrigger: 'GSAP ScrollTrigger',
    Lenis: 'Lenis', LocomotiveScroll: 'Locomotive Scroll', THREE: 'three.js',
    particlesJS: 'particles.js', pJSDom: 'particles.js (instances)', Typed: 'Typed.js',
    jQuery: 'jQuery', Swiper: 'Swiper', Vue: 'Vue', React: 'React', Alpine: 'Alpine.js',
    Shopify: 'Shopify storefront', wp: 'WordPress', et_pb_custom: 'Divi builder',
    DIVI: 'Divi theme', AOS: 'AOS', SplitType: 'SplitType', imagesLoaded: 'imagesLoaded',
    Splide: 'Splide', Flickity: 'Flickity', mejs: 'MediaElement.js'
  };
  for (const [key, name] of Object.entries(GLOBALS)) {
    try {
      if (typeof window[key] !== 'undefined') {
        let version = null;
        try {
          const v = window[key];
          version = (v && (v.version || v.VERSION)) || null;
          if (key === 'jQuery' && window.jQuery.fn) version = window.jQuery.fn.jquery;
        } catch (e) {}
        addLib(name, version, 'window.' + key, { globalType: typeof window[key] });
      }
    } catch (e) {}
  }
  // GSAP hides behind gsapVersions when bundled as an ES module with no gsap global.
  try {
    if (Array.isArray(window.gsapVersions)) {
      addLib('GSAP', window.gsapVersions.join(', '), 'window.gsapVersions');
    }
  } catch (e) {}
  // Vue 3 SSR/runtime leaves these setters even when the Vue global is absent.
  try {
    if ('__VUE_INSTANCE_SETTERS__' in window || '__VUE_SSR_SETTERS__' in window) {
      addLib('Vue 3', null, 'window.__VUE_INSTANCE_SETTERS__');
    }
  } catch (e) {}
  // 2. DOM fingerprints for libraries bundled with no global at all
  const DOM_FINGERPRINTS = [
    ['Lenis', 'html.lenis, html.lenis-smooth', 'html class "lenis"'],
    ['Locomotive Scroll', '[data-scroll-container], [data-scroll-speed], [data-scroll-section]', 'data-scroll* attributes'],
    ['Barba.js', '[data-barba="container"], [data-barba="wrapper"]', 'data-barba attributes'],
    ['particles.js', '#divi-particles, #particles-js, canvas.particles-js-canvas-el', 'particles canvas element'],
    ['Typed.js', '.typed-cursor, .typed-me', '.typed-cursor element'],
    ['MediaElement.js', '.mejs-container', '.mejs-container element'],
    ['Divi builder', '.et_pb_section, .et_builder_inner_content', '.et_pb_section element']
  ];
  for (const [name, sel, via] of DOM_FINGERPRINTS) {
    let n = 0;
    try { n = document.querySelectorAll(sel).length; } catch (e) {}
    if (n > 0) addLib(name, null, via, { elementCount: n });
  }
  // 3. script URLs, including WordPress ?ver= which carries exact plugin versions
  for (const s of document.scripts) {
    if (!s.src) continue;
    let u;
    try { u = new URL(s.src, location.href); } catch (e) { continue; }
    const ver = u.searchParams.get('ver');
    const plugin = u.pathname.match(/\\/wp-content\\/plugins\\/([^/]+)\\//);
    const theme = u.pathname.match(/\\/wp-content\\/themes\\/([^/]+)\\//);
    if (plugin) addLib('wp-plugin: ' + plugin[1], ver, 'script ?ver=', { url: u.href, downloaded: false });
    else if (theme) addLib('wp-theme: ' + theme[1], ver, 'script ?ver=', { url: u.href, downloaded: false });
    else {
      const seg = u.pathname.split('/').filter(Boolean).pop() || '';
      if (/particles|lenis|locomotive|barba|gsap|typed|swiper|three/i.test(seg)) {
        addLib(seg.replace(/\\.min\\.js$|\\.js$/, ''), ver, 'script URL path', { url: u.href, downloaded: false });
      }
    }
  }
  out.libraries = libs;

  // --- theme config exposed on window --------------------------------------
  // ethnocare publishes its entire breakpoint ladder here. Worth more than inferring it from CSS.
  try {
    if (window.config && typeof window.config === 'object') {
      out.siteConfig = JSON.parse(JSON.stringify(window.config));
    }
  } catch (e) {}

  // --- observers ------------------------------------------------------------
  out.observersDeclared = (window.__forensics && window.__forensics.observers) || [];
  if (out.observersDeclared.length === 0) {
    warnings.push({ code: 'NO_INTERSECTION_OBSERVERS', detail: 'the site constructed no IntersectionObserver; reveal thresholds must come from revealsObserved' });
  }

  // --- DOM outline ----------------------------------------------------------
  const bgOf = (el) => {
    let cur = el;
    for (let i = 0; i < 8 && cur; i++) {
      const c = toHex(getComputedStyle(cur).backgroundColor);
      if (c) return c;
      cur = cur.parentElement;
    }
    return null;
  };
  // Named components only. A bare "main > *" also matches the Shopify section wrapper, the article
  // and the u-anim-page section, each of which is the entire 56000px document; they produce a
  // nine-megabyte "section" screenshot named 00-div that shows the whole page and names nothing.
  // A wrapper that spans essentially the whole document is excluded for the same reason.
  const OUTLINE_SEL = '.et_pb_section, .c-section-3d, .c-images-sequence, .c-fadein-text, .c-quote, .c-push-products, .c-carousel-circular, .c-specifications, .c-pre-footer, .c-footer, .c-hero, .c-rail, .c-card-cta, .c-tile-page-push, .c-product-switcher, .c-infos-bar, .c-header, main > section:not(.u-anim-page), main > article > section:not(.u-anim-page)';
  const docHeight = document.documentElement.scrollHeight;
  const seenOutline = new Set();
  const outline = [];
  let index = 0;
  for (const el of document.querySelectorAll(OUTLINE_SEL)) {
    const rect = el.getBoundingClientRect();
    if (rect.height < 120) continue;
    const cls = typeof el.className === 'string' ? el.className.trim() : '';
    const block = cls.split(/\\s+/).find((c) => /^(c-|et_pb_section_?\\d*$)/.test(c)) || null;
    // Unnamed full-document wrapper: not a section, whatever the selector says.
    if (!block && rect.height > docHeight * 0.9) continue;
    const selector = el.id ? '#' + el.id : (block ? '.' + block : (el.tagName || '').toLowerCase());
    const key = selector + '@' + Math.round(rect.top + window.scrollY);
    if (seenOutline.has(key)) continue;
    seenOutline.add(key);
    const cs = getComputedStyle(el);
    outline.push({
      index: index++,
      slug: (block || (el.tagName || '').toLowerCase()).replace(/^c-/, ''),
      selector,
      classes: cls.slice(0, 160),
      rect: {
        top: Math.round(rect.top + window.scrollY),
        height: Math.round(rect.height),
        width: Math.round(rect.width)
      },
      firstHeading: (() => { const h = el.querySelector('h1,h2,h3'); return h ? norm(h.textContent).replace(/\\s+/g, ' ').slice(0, 90) : null; })(),
      background: bgOf(el),
      paddingBox: cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft,
      containsVideo: el.querySelectorAll('video').length,
      containsCanvas: el.querySelectorAll('canvas').length,
      containsIframe: el.querySelectorAll('iframe').length,
      position: cs.position,
      theme: cls.includes('u-theme-dark') ? 'dark' : (cls.includes('u-theme-light') ? 'light' : null)
    });
    if (outline.length >= 80) break;
  }
  out.domOutline = outline.sort((a, b) => a.rect.top - b.rect.top).map((o, i) => ({ ...o, index: i }));

  // --- page geometry --------------------------------------------------------
  out.geometry = {
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio,
    htmlClasses: document.documentElement.className,
    bodyClasses: document.body.className,
    htmlOverflow: getComputedStyle(document.documentElement).overflow,
    bodyOverflow: getComputedStyle(document.body).overflow,
    title: document.title
  };

  // --- media inventory (URLs only, nothing fetched or stored) --------------
  out.media = {
    images: [...document.querySelectorAll('img')].slice(0, 120).map((img) => {
      const r = img.getBoundingClientRect();
      return {
        currentSrc: img.currentSrc || img.src || null,
        srcset: img.getAttribute('srcset') || null,
        sizes: img.getAttribute('sizes') || null,
        alt: img.alt || null,
        loading: img.loading || null,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        renderedWidth: Math.round(r.width),
        renderedHeight: Math.round(r.height),
        pixelDensityServed: r.width > 0 ? round(img.naturalWidth / r.width, 2) : null,
        objectFit: getComputedStyle(img).objectFit,
        downloaded: false
      };
    }),
    videos: [...document.querySelectorAll('video')].map((v) => {
      const r = v.getBoundingClientRect();
      const parent = v.parentElement;
      const pcs = parent ? getComputedStyle(parent) : null;
      return {
        currentSrc: v.currentSrc || v.src || null,
        dataSrc: v.dataset ? (v.dataset.src || null) : null,
        sources: [...v.querySelectorAll('source')].map((s) => ({
          src: s.src || s.getAttribute('src'), type: s.type || null, media: s.media || null
        })),
        poster: v.poster || null,
        autoplay: v.autoplay, loop: v.loop, muted: v.muted, playsInline: v.playsInline,
        preload: v.preload,
        durationSeconds: Number.isFinite(v.duration) ? round(v.duration, 3) : null,
        intrinsic: { width: v.videoWidth, height: v.videoHeight },
        rendered: { width: Math.round(r.width), height: Math.round(r.height) },
        objectFit: getComputedStyle(v).objectFit,
        parentMixBlendMode: pcs ? pcs.mixBlendMode : null,
        parentFilter: pcs ? pcs.filter : null,
        parentBackgroundImage: pcs ? pcs.backgroundImage.slice(0, 200) : null,
        downloaded: false
      };
    }),
    canvases: [...document.querySelectorAll('canvas')].map((c) => {
      const r = c.getBoundingClientRect();
      return {
        className: typeof c.className === 'string' ? c.className : null,
        id: c.id || null,
        backingStore: { width: c.width, height: c.height },
        rendered: { width: Math.round(r.width), height: Math.round(r.height) },
        parentClass: c.parentElement ? String(c.parentElement.className).slice(0, 100) : null,
        position: getComputedStyle(c).position,
        zIndex: getComputedStyle(c).zIndex,
        contextGuess: (() => {
          try { return c.getContext('webgl2') ? 'webgl2' : (c.getContext('webgl') ? 'webgl' : '2d-or-lost'); }
          catch (e) { return 'unknown'; }
        })()
      };
    }),
    iframes: [...document.querySelectorAll('iframe')].map((f) => ({
      src: f.src || null, title: f.title || null, loading: f.loading || null, downloaded: false
    }))
  };

  // --- overlay guard --------------------------------------------------------
  const obstructions = [];
  for (const el of document.querySelectorAll('*')) {
    let cs;
    try { cs = getComputedStyle(el); } catch (e) { continue; }
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    const z = parseInt(cs.zIndex, 10);
    if (!Number.isFinite(z) || z <= 1000) continue;
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) continue;
    const r = el.getBoundingClientRect();
    const coverage = (r.width * r.height) / (window.innerWidth * window.innerHeight);
    if (coverage > 0.25) {
      obstructions.push({
        selector: el.id ? '#' + el.id : (el.tagName || '').toLowerCase() +
          (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : ''),
        zIndex: z, coveragePercent: round(coverage * 100, 1)
      });
    }
  }
  if (obstructions.length) warnings.push({ code: 'VIEWPORT_OBSTRUCTED', obstructions });

  return out;
})()
`;

// ---------------------------------------------------------------------------
// Node-side helpers
// ---------------------------------------------------------------------------

/**
 * Least-squares fit of translateY against scrollY. r² above 0.99 means true linear parallax at that
 * ratio and the spec can name the ratio; a poor fit means the motion is eased or clamped and the
 * spec should say so instead of naming a number that is not the one the site uses.
 */
function fitLinear(points) {
  const n = points.length;
  if (n < 3) return null;
  const sx = points.reduce((a, p) => a + p.x, 0);
  const sy = points.reduce((a, p) => a + p.y, 0);
  const sxx = points.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = points.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const meanY = sy / n;
  const ssTot = points.reduce((a, p) => a + (p.y - meanY) ** 2, 0);
  const ssRes = points.reduce(
    (a, p) => a + (p.y - (slope * p.x + intercept)) ** 2,
    0,
  );
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return {
    slope: Number(slope.toFixed(5)),
    intercept: Number(intercept.toFixed(3)),
    r2: Number(r2.toFixed(5)),
    samples: n,
    interpretation:
      r2 > 0.99
        ? "linear parallax"
        : r2 > 0.9
          ? "near-linear, mildly eased or clamped"
          : "not linear in scrollY — eased, clamped or timeline-driven",
  };
}

/** Parse every particlesJS(id, {...}) call out of a script body, without executing it. */
function parseParticlesCalls(source) {
  const calls = [];
  const re = /particlesJS\(\s*"([^"]+)"\s*,\s*/g;
  let m;
  while ((m = re.exec(source))) {
    const start = source.indexOf("{", re.lastIndex - 1);
    if (start === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = start; i < source.length; i++) {
      if (source[i] === "{") depth++;
      else if (source[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    if (end === -1) continue;
    try {
      calls.push({
        target: m[1],
        config: JSON.parse(source.slice(start, end)),
      });
    } catch (e) {
      calls.push({ target: m[1], parseError: e.message });
    }
  }
  return calls;
}

// ---------------------------------------------------------------------------
// Capture
// ---------------------------------------------------------------------------

class Run {
  constructor(siteKey) {
    this.siteKey = siteKey;
    this.dir = resolve(outRoot, siteKey);
    this.artifacts = [];
    this.warnings = [];
  }

  warn(code, detail, affects = []) {
    this.warnings.push({ code, detail, affects });
    console.warn(`    ! ${code}: ${detail}`);
  }

  /** Record an artifact. `describes` is what lets an agent pick twelve files without opening 400. */
  record(
    path,
    kind,
    { pass = null, viewport = null, route = null, describes },
  ) {
    if (!existsSync(path)) return null;
    const entry = {
      path: rel(path),
      kind,
      pass,
      viewport,
      route,
      bytes: statSync(path).size,
      sha256: sha256File(path),
      describes,
    };
    this.artifacts.push(entry);
    return entry;
  }

  file(...parts) {
    const path = resolve(this.dir, ...parts);
    mkdirSync(resolve(path, ".."), { recursive: true });
    return path;
  }
}

async function newContext(browser, viewport, extra = {}) {
  return browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.dpr,
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
    locale: "en-US",
    timezoneId: "America/Chicago",
    colorScheme: "light",
    reducedMotion: "no-preference",
    // Headless Chromium advertises "HeadlessChrome" in its UA and Cloudflare notices. Borrow the
    // real Chrome string Playwright ships for Desktop Chrome.
    userAgent: devices["Desktop Chrome"].userAgent,
    ...extra,
  });
}

/** Wire console/pageerror/response listeners onto a context so subframes are covered too. */
function instrumentContext(context, sink) {
  context.on("console", (msg) => {
    if (sink.console.length >= 400) return;
    sink.console.push({
      type: msg.type(),
      text: msg.text().slice(0, 500),
      url: msg.location()?.url ?? null,
    });
  });
  context.on("weberror", (err) => {
    if (sink.errors.length >= 200) return;
    sink.errors.push({
      message: String(err.error()).slice(0, 600),
      url: err.page()?.url() ?? null,
    });
  });
  context.on("response", async (response) => {
    if (sink.network.length >= 1500) return;
    const request = response.request();
    const url = response.url();
    const entry = {
      url: url.length > 400 ? url.slice(0, 400) + "…" : url,
      method: request.method(),
      status: response.status(),
      resourceType: request.resourceType(),
      contentType: response.headers()["content-type"] ?? null,
      // Header-reported size. Nothing here is a copy of a body.
      contentLength: Number(response.headers()["content-length"] ?? 0) || null,
      fromCache: response.fromServiceWorker(),
      downloaded: false,
    };
    // Version strings only, read transiently and never stored as a body. response.text() throws for
    // a body Chromium has already discarded; an unguarded throw in this listener kills the listener
    // and silently loses the rest of the network log.
    if (
      request.resourceType() === "script" &&
      entry.contentLength &&
      entry.contentLength < BODY_READ_CAP
    ) {
      try {
        const body = await response.text();
        const v = body.match(
          /(?:version|VERSION)\s*[:=]\s*["']([\d]+\.[\d.]+[\w.-]*)["']/,
        );
        if (v) entry.versionString = v[1];
        const banner = body
          .slice(0, 400)
          .match(/([A-Za-z][\w.-]{2,24})\s+v?(\d+\.\d+\.\d+)/);
        if (banner) entry.bannerVersion = `${banner[1]} ${banner[2]}`;
      } catch {
        entry.bodyReadFailed = true;
      }
    }
    sink.network.push(entry);
  });
}

/**
 * Wait for the page to settle: load, a networkidle hint that is never a gate, fonts, then a
 * top-to-bottom sweep that triggers lazy images, then back to the top.
 *
 * networkidle is a hint because Vimeo and GTM poll forever and it will never fire on either target.
 */
async function settle(page, run, route) {
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});

  const sweep = await page.evaluate(async () => {
    const step = Math.max(200, Math.round(window.innerHeight * 0.8));
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 400));
    const deadline = Date.now() + 10000;
    let stragglers = [];
    while (Date.now() < deadline) {
      stragglers = [...document.images]
        .filter((i) => !(i.complete && i.naturalWidth > 0))
        .map((i) => (i.currentSrc || i.src || "(no src)").slice(0, 160));
      if (stragglers.length === 0) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    return {
      imageCount: document.images.length,
      stragglers: stragglers.slice(0, 12),
    };
  });

  if (sweep.stragglers.length) {
    run.warn(
      "LAZY_IMAGES_INCOMPLETE",
      `${sweep.stragglers.length} image(s) never completed on ${route}`,
      sweep.stragglers,
    );
  }
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  return sweep;
}

/** Close cookie banners and modals that survived the localStorage seed. */
async function dismissOverlays(page) {
  const SELECTORS = [
    "button.cm__btn--close",
    ".cm__btn-group button",
    "#cookiescript_accept",
    "[aria-label='Close']",
    "[aria-label='close']",
    ".c-modal button[aria-label]",
    "button[data-dismiss]",
    ".et_pb_newsletter_button",
    "#dp-overlay-close",
  ];
  for (const sel of SELECTORS) {
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) && (await loc.isVisible({ timeout: 300 }))) {
        await loc.click({ timeout: 900, force: true }).catch(() => {});
      }
    } catch {
      /* a selector that does not exist is the normal case */
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}

/**
 * Full-page screenshot with an explicit banding fallback.
 *
 * Chromium truncates a screenshot whose raster exceeds 16384 device px in either axis, and does it
 * silently — the file is well formed and simply missing the bottom of the page. The ethnocare home
 * route measured 56821 CSS px in this run, so banding is the normal path there, not an edge case.
 */
async function fullPageShot(page, run, { route, viewport, pass, baseName }) {
  const geometry = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    dpr: window.devicePixelRatio,
  }));
  const devicePx = geometry.scrollHeight * geometry.dpr;

  if (devicePx <= MAX_TEXTURE_PX) {
    const path = run.file("shots", `${baseName}.png`);
    await page.screenshot({ path, fullPage: true, animations: "disabled" });
    run.record(path, "fullpage", {
      pass,
      viewport,
      route,
      describes: `Whole ${route} page at ${viewport}, ${geometry.scrollHeight}px tall, single image (under the 16384px raster limit).`,
    });
    return { banded: false, scrollHeight: geometry.scrollHeight };
  }

  const bandCount = Math.min(
    MAX_BANDS,
    Math.ceil(geometry.scrollHeight / BAND_CSS_PX),
  );
  const bands = [];
  for (let i = 0; i < bandCount; i++) {
    const y = i * BAND_CSS_PX;
    const height = Math.min(BAND_CSS_PX, geometry.scrollHeight - y);
    if (height <= 0) break;
    const path = run.file(
      "shots",
      `${baseName}-band${String(i).padStart(2, "0")}.jpg`,
    );
    try {
      await page.screenshot({
        path,
        fullPage: true,
        animations: "disabled",
        type: "jpeg",
        quality: 78,
        clip: { x: 0, y, width: geometry.innerWidth, height },
      });
    } catch (error) {
      run.warn(
        "BAND_SCREENSHOT_FAILED",
        `${route} ${viewport} band ${i}: ${error.message}`,
        [rel(path)],
      );
      continue;
    }
    bands.push({ index: i, y, height });
    run.record(path, "fullpage-band", {
      pass,
      viewport,
      route,
      describes: `Band ${i} of ${bandCount} of the ${route} page at ${viewport}: CSS y ${y}–${y + height} of ${geometry.scrollHeight}. JPEG q78 because the whole page is ${devicePx}px at dpr ${geometry.dpr}, past Chromium's 16384px raster limit.`,
    });
  }
  const truncated = bandCount * BAND_CSS_PX < geometry.scrollHeight;
  if (truncated) {
    run.warn(
      "FULLPAGE_BANDS_TRUNCATED",
      `${route} ${viewport} is ${geometry.scrollHeight}px; captured ${bandCount} bands covering ${bandCount * BAND_CSS_PX}px`,
      [`docs/ui-reference/${run.siteKey}/shots/${baseName}-band*.jpg`],
    );
  }
  return {
    banded: true,
    bands,
    scrollHeight: geometry.scrollHeight,
    truncated,
  };
}

/**
 * One route, one viewport, one pass. The order inside this function is the whole determinism
 * contract and is why it is a single function: load, settle, extract motion JSON, only then inject
 * the freeze stylesheet, only then screenshot. Inject the freeze earlier and the extract faithfully
 * reports every transition on the page as 0s.
 */
async function capturePass(page, run, { site, route, viewport, pass }) {
  const url = site.origin + route.path;
  const label = `${route.slug} ${viewport.name} ${pass}`;
  process.stdout.write(`    ${label}\n`);

  await page.goto(url, { waitUntil: "load", timeout: 45000 });
  await dismissOverlays(page);
  await settle(page, run, route.slug);

  // Library fingerprints, taken BEFORE the smooth-scroll teardown.
  //
  // This is not belt-and-braces. Lenis and Locomotive are bundled as ES modules on ethnocare.ca with
  // no global to detect, so the only evidence they are running is `html.lenis lenis-smooth` and the
  // data-scroll* attribute vocabulary — and the teardown below deliberately strips exactly those.
  // Extracting afterwards produced a libraries[] that omitted Lenis entirely while the site was
  // demonstrably using it. Snapshot first, merge after.
  const preTeardown = await page.evaluate(() => {
    const found = [];
    const FINGERPRINTS = [
      [
        "Lenis",
        "html.lenis, html.lenis-smooth",
        'html class "lenis" (pre-teardown)',
      ],
      [
        "Locomotive Scroll",
        "[data-scroll-container], [data-scroll-speed], [data-scroll-section], [data-scroll]",
        "data-scroll* attributes (pre-teardown)",
      ],
      [
        "Barba.js",
        '[data-barba="container"], [data-barba="wrapper"]',
        "data-barba attributes (pre-teardown)",
      ],
    ];
    for (const [name, selector, detectedVia] of FINGERPRINTS) {
      let n = 0;
      try {
        n = document.querySelectorAll(selector).length;
      } catch {
        continue;
      }
      if (n > 0)
        found.push({ name, version: null, detectedVia, elementCount: n });
    }
    return {
      libraries: found,
      htmlClasses: document.documentElement.className,
      dataScrollSpeedValues: [
        ...new Set(
          [...document.querySelectorAll("[data-scroll-speed]")].map((e) =>
            e.getAttribute("data-scroll-speed"),
          ),
        ),
      ],
    };
  });

  let teardown = null;
  if (pass === "native") {
    teardown = await page.evaluate(TEARDOWN_SMOOTH_SCROLL);
    // A page that was already one screen tall before the teardown is not a teardown failure — it is
    // a one-screen page, and www.andrewrinehart.us genuinely is one. Separating the two matters:
    // the first means a full-page screenshot was lost and the artifact tree has a hole, the second
    // means the above-fold shot already *is* the whole page.
    if (!teardown.ok) {
      const wasAlreadyShort =
        teardown.before.scrollHeight <= teardown.before.innerHeight * 1.2;
      if (wasAlreadyShort) {
        teardown.oneScreenPage = true;
        run.warn(
          "PAGE_IS_ONE_SCREEN",
          `${label}: the whole document is ${teardown.after.scrollHeight}px against a ${teardown.after.innerHeight}px viewport, so abovefold IS the full page and no fullpage artifact is expected`,
          [url],
        );
      } else {
        run.warn(
          "SMOOTH_SCROLL_TEARDOWN_FAILED",
          `${label}: document was ${teardown.before.scrollHeight}px before teardown but scrollHeight/innerHeight is now ${teardown.ratio}; refusing to emit a viewport-height image labelled fullpage`,
          [url],
        );
      }
    }
    await page.waitForTimeout(400);
  }

  // 1. Extract BEFORE the freeze.
  const extract = await page.evaluate(EXTRACT);
  extract.pass = pass;
  extract.viewport = viewport.name;
  extract.route = route.slug;
  extract.url = url;
  extract.capturedAt = new Date().toISOString();
  if (teardown) extract.smoothScrollTeardown = teardown;

  // Merge the pre-teardown fingerprints in, keeping any the in-page walk also found.
  extract.htmlClassesBeforeTeardown = preTeardown.htmlClasses;
  extract.dataScrollSpeedValues = preTeardown.dataScrollSpeedValues;
  for (const library of preTeardown.libraries) {
    const existing = extract.libraries.find((l) => l.name === library.name);
    if (existing) existing.alsoDetectedVia = library.detectedVia;
    else extract.libraries.push(library);
  }
  for (const w of extract.warnings ?? []) {
    run.warn(
      w.code,
      `${label}: ${w.detail ?? JSON.stringify(w.obstructions ?? w)}`,
      [url],
    );
  }
  for (const href of extract.stylesheetCors ?? []) {
    run.warn("STYLESHEET_CORS", `${label}: .cssRules threw for ${href}`, [
      href,
    ]);
  }

  // Refetch every CORS-blocked sheet through the context's request API, which reuses cookies and is
  // not subject to the CSSOM same-origin rule, and parse the text here in Node.
  if ((extract.stylesheetCors ?? []).length) {
    extract.refetchedStylesheets = [];
    for (const href of extract.stylesheetCors) {
      if (!href || href === "(inline)") continue;
      try {
        const response = await page.request.get(href, { timeout: 12000 });
        if (!response.ok()) continue;
        const text = await response.text();
        extract.refetchedStylesheets.push({
          href,
          source: "refetched",
          bytes: text.length,
          mediaConditions: [
            ...new Set(
              [...text.matchAll(/@media([^{]+)\{/g)].map((m) => m[1].trim()),
            ),
          ].slice(0, 40),
          fontFaces: [...text.matchAll(/@font-face\s*\{([^}]*)\}/g)]
            .slice(0, 30)
            .map((m) => {
              const body = m[1];
              const pick = (p) =>
                (body.match(new RegExp(p + "\\s*:\\s*([^;]+)")) ||
                  [])[1]?.trim() ?? null;
              const src = pick("src");
              return {
                family: pick("font-family"),
                weight: pick("font-weight"),
                style: pick("font-style"),
                display: pick("font-display"),
                unicodeRange: pick("unicode-range"),
                src: src ? src.slice(0, 400) : null,
                downloaded: false,
              };
            }),
          keyframes: [
            ...new Set(
              [...text.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]),
            ),
          ].slice(0, 60),
          rootCustomProperties: Object.fromEntries(
            [...text.matchAll(/(?::root|html)[^{]*\{([^}]*)\}/g)]
              .flatMap((m) => [...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)])
              .map((m) => [m[1], m[2].trim()])
              .slice(0, 120),
          ),
        });
      } catch (error) {
        run.warn("STYLESHEET_REFETCH_FAILED", `${href}: ${error.message}`, [
          href,
        ]);
      }
    }
  }

  const extractPath = run.file(
    "routes",
    route.slug,
    `extract.${viewport.name}.${pass}.json`,
  );
  writeJson(extractPath, extract);
  run.record(extractPath, "extract", {
    pass,
    viewport: viewport.name,
    route: route.slug,
    describes: `Full design-system measurement of ${route.slug} at ${viewport.name} (${pass} pass): ${extract.customProperties.count} custom properties declared+resolved, ${extract.typography.length} typographic roles, ${extract.colors.length} colours ranked by painted area, ${extract.motion.transitions.length} transition fingerprints, ${extract.motion.animations.length} animations with keyframes, ${extract.breakpoints.length} breakpoints, ${extract.domOutline.length} sections.`,
  });

  // 2. Freeze, then shoot.
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.waitForTimeout(250);

  const aboveFold = run.file(
    "shots",
    `abovefold.${route.slug}.${viewport.name}.png`,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: aboveFold, animations: "disabled" });
  run.record(aboveFold, "abovefold", {
    pass,
    viewport: viewport.name,
    route: route.slug,
    describes: `First ${viewport.height}px of ${route.slug} at ${viewport.width}px wide, animations frozen at their end state.`,
  });

  let fullPage = null;
  if (
    FULL_VIEWPORTS.has(viewport.name) &&
    pass === "native" &&
    (!teardown || teardown.ok)
  ) {
    fullPage = await fullPageShot(page, run, {
      route: route.slug,
      viewport: viewport.name,
      pass,
      baseName: `fullpage.${route.slug}.${viewport.name}`,
    });
  }

  // 3. Per-section shots, from the outline the extract just measured.
  if (FULL_VIEWPORTS.has(viewport.name) && pass === "native") {
    let n = 0;
    for (const section of extract.domOutline) {
      if (n >= 14) break;
      const path = run.file(
        "sections",
        `${String(n).padStart(2, "0")}-${section.slug}.${route.slug}.${viewport.name}.jpg`,
      );
      try {
        const loc = page.locator(section.selector).first();
        if (!(await loc.count())) continue;
        // A zero-height or hidden match — .c-card-cta is inside a closed modal at mobile — makes
        // locator.screenshot() wait for visibility and then throw after its full timeout. Twenty-two
        // of those cost several minutes on the first pass and produced nothing.
        if (!(await loc.isVisible().catch(() => false))) continue;
        const box = await loc.boundingBox();
        if (!box || box.height < 80 || box.width < 8) continue;
        // A scroll-driven section on this site is routinely taller than ten viewports — the tallest
        // measured 16748px. Capturing all of it produces a nine-megabyte strip that shows the same
        // sticky element repeated. Clip to the top SECTION_CLIP_PX; the banded full-page shots and
        // the scroll-frame sequence already carry what happens further down.
        const clipped = box.height > SECTION_CLIP_PX;
        await loc.screenshot({
          path,
          animations: "disabled",
          type: "jpeg",
          quality: 84,
          ...(clipped
            ? {
                clip: {
                  x: box.x,
                  y: box.y,
                  width: box.width,
                  height: SECTION_CLIP_PX,
                },
              }
            : {}),
        });
        run.record(path, "section", {
          pass,
          viewport: viewport.name,
          route: route.slug,
          describes: `Section ${n} "${section.slug}" of ${route.slug} at ${viewport.name}: ${Math.round(box.height)}px tall, background ${section.background ?? "none"}, padding ${section.paddingBox}${section.firstHeading ? `, heading "${section.firstHeading}"` : ""}${clipped ? `, clipped to the top ${SECTION_CLIP_PX}px of ${Math.round(box.height)}px` : ""}.`,
        });
        n++;
      } catch (error) {
        run.warn(
          "SECTION_SHOT_FAILED",
          `${label} ${section.selector}: ${error.message}`,
          [rel(path)],
        );
      }
    }
  }

  return { extract, teardown, fullPage };
}

/**
 * Hover and focus deltas. Two pictures of a button tell a spec writer nothing they can copy; the
 * diff of getComputedStyle before and after tells them `background-color goes #0F2536 to #FFCE34
 * over 400ms cubic-bezier(0.19,1,0.22,1)`, which is the line that ends up in the spec.
 */
async function captureStates(page, run, { site, route, viewport }) {
  const deltas = [];
  const TRACKED = [
    "color",
    "backgroundColor",
    "backgroundImage",
    "borderColor",
    "borderRadius",
    "opacity",
    "transform",
    "boxShadow",
    "textDecorationColor",
    "textDecorationLine",
    "letterSpacing",
    "filter",
    "outlineColor",
    "outlineWidth",
    "scale",
    "translate",
  ];

  for (const target of site.stateTargets) {
    for (const state of ["hover", "focus"]) {
      let path = null;
      try {
        // .u-hover-underline's first match on every route lives inside the closed menu modal, so
        // `.first()` alone hovers something that can never be visible and times out. Walk the
        // matches and take the first one that is genuinely on the page.
        const all = page.locator(target.selector);
        const total = Math.min(await all.count(), 12);
        let loc = null;
        for (let i = 0; i < total; i++) {
          const candidate = all.nth(i);
          if (!(await candidate.isVisible().catch(() => false))) continue;
          const box = await candidate.boundingBox().catch(() => null);
          if (box && box.width > 4 && box.height > 4) {
            loc = candidate;
            break;
          }
        }
        if (!loc) continue;

        const before = await loc.evaluate((el, props) => {
          const cs = getComputedStyle(el);
          const o = {};
          for (const p of props) o[p] = cs[p];
          o.transitionProperty = cs.transitionProperty;
          o.transitionDuration = cs.transitionDuration;
          o.transitionTimingFunction = cs.transitionTimingFunction;
          o.transitionDelay = cs.transitionDelay;
          return o;
        }, TRACKED);

        if (state === "hover") await loc.hover({ timeout: 4000 });
        else await loc.focus({ timeout: 4000 });
        await page.waitForTimeout(700);

        const after = await loc.evaluate((el, props) => {
          const cs = getComputedStyle(el);
          const o = {};
          for (const p of props) o[p] = cs[p];
          return o;
        }, TRACKED);

        const changed = {};
        for (const p of TRACKED)
          if (before[p] !== after[p])
            changed[p] = { from: before[p], to: after[p] };

        // JPEG: these corroborate the computed-style delta beside them, which is the artifact a spec
        // is actually written from. A lossless full-viewport PNG per hover state per route per
        // viewport came to 133MB on the first pass for no added information.
        path = run.file(
          "states",
          `${state}-${target.slug}.${route.slug}.${viewport.name}.jpg`,
        );
        await page.screenshot({
          path,
          animations: "disabled",
          type: "jpeg",
          quality: 85,
        });
        run.record(path, `state-${state}`, {
          pass: "native",
          viewport: viewport.name,
          route: route.slug,
          describes: `${target.selector} in :${state} on ${route.slug} at ${viewport.name}. ${Object.keys(changed).length} computed properties changed: ${Object.keys(changed).join(", ") || "none"}.`,
        });

        deltas.push({
          slug: target.slug,
          selector: target.selector,
          state,
          route: route.slug,
          viewport: viewport.name,
          changed,
          transition: {
            property: before.transitionProperty,
            duration: before.transitionDuration,
            timingFunction: before.transitionTimingFunction,
            delay: before.transitionDelay,
          },
          screenshot: path ? rel(path) : null,
        });

        await page.mouse.move(2, 2);
        await page.evaluate(() => document.activeElement?.blur?.());
      } catch (error) {
        run.warn(
          "STATE_CAPTURE_FAILED",
          `${target.selector} :${state} on ${route.slug} ${viewport.name}: ${error.message}`,
          path ? [rel(path)] : [],
        );
      }
    }
  }

  // nav-open and nav-scrolled
  if (site.chrome.navToggle) {
    let path = null;
    try {
      const toggle = page.locator(site.chrome.navToggle).first();
      if ((await toggle.count()) && (await toggle.isVisible())) {
        await toggle.click({ timeout: 4000 });
        await page.waitForTimeout(1100);
        path = run.file(
          "states",
          `nav-open.${route.slug}.${viewport.name}.jpg`,
        );
        await page.screenshot({
          path,
          animations: "disabled",
          type: "jpeg",
          quality: 85,
        });
        run.record(path, "state-nav-open", {
          pass: "native",
          viewport: viewport.name,
          route: route.slug,
          describes: `Navigation panel open (${site.chrome.navToggle} clicked) on ${route.slug} at ${viewport.name}.`,
        });
        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(600);
      }
    } catch (error) {
      run.warn(
        "NAV_OPEN_FAILED",
        `${site.chrome.navToggle} on ${route.slug} ${viewport.name}: ${error.message}`,
        path ? [rel(path)] : [],
      );
    }
  }

  if (site.chrome.header) {
    let path = null;
    try {
      const headerBefore = await page
        .locator(site.chrome.header)
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            backgroundColor: cs.backgroundColor,
            height: cs.height,
            transform: cs.transform,
            backdropFilter: cs.backdropFilter,
            boxShadow: cs.boxShadow,
            classes: el.className,
          };
        });
      await page.mouse.wheel(0, 900);
      await page.waitForTimeout(1200);
      const headerAfter = await page
        .locator(site.chrome.header)
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            backgroundColor: cs.backgroundColor,
            height: cs.height,
            transform: cs.transform,
            backdropFilter: cs.backdropFilter,
            boxShadow: cs.boxShadow,
            classes: el.className,
          };
        });
      path = run.file(
        "states",
        `nav-scrolled.${route.slug}.${viewport.name}.jpg`,
      );
      await page.screenshot({
        path,
        animations: "disabled",
        type: "jpeg",
        quality: 85,
      });
      run.record(path, "state-nav-scrolled", {
        pass: "live",
        viewport: viewport.name,
        route: route.slug,
        describes: `Header after scrolling 900px on ${route.slug} at ${viewport.name}. background ${headerBefore.backgroundColor} -> ${headerAfter.backgroundColor}, classes "${headerBefore.classes}" -> "${headerAfter.classes}".`,
      });
      deltas.push({
        slug: "header",
        selector: site.chrome.header,
        state: "scrolled",
        route: route.slug,
        viewport: viewport.name,
        changed: { before: headerBefore, after: headerAfter },
        screenshot: rel(path),
      });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(800);
    } catch (error) {
      run.warn(
        "NAV_SCROLLED_FAILED",
        `${site.chrome.header} on ${route.slug} ${viewport.name}: ${error.message}`,
        path ? [rel(path)] : [],
      );
    }
  }

  return deltas;
}

/**
 * Scroll frames on the live pass.
 *
 * Targets, not intervals: y_i = round(i * travel / (N-1)). Actuated with page.mouse.wheel, which
 * dispatches a trusted wheel event — the thing smooth-scroll libraries consume. They ignore
 * programmatic window.scrollTo, so a scrollTo loop on a Lenis page produces sixteen copies of the
 * hero. Settling is three consecutive identical samples 100ms apart, capped at 5s; a bare
 * waitForTimeout either wastes seconds or shoots mid-animation, and which one it does varies run to
 * run.
 */
async function captureScrollFrames(
  page,
  run,
  { site, route, viewport, frameCount },
) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    window.__forensics.reveals.length = 0;
    window.__scrollSamples = [];
  });
  // Park the pointer in the middle of the viewport before any wheeling. page.mouse.wheel dispatches
  // at the pointer's current position, which starts at (0,0) — the top-left corner, where a fixed
  // header or an inner scroller can swallow the event. That is how /pages/support advanced 42px on
  // the first pass and had the rest of its frames abandoned.
  const size = page.viewportSize();
  if (size)
    await page.mouse.move(
      Math.round(size.width / 2),
      Math.round(size.height / 2),
    );
  await page.waitForTimeout(900);

  const geometry = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    innerHeight: window.innerHeight,
  }));
  const travel = Math.max(0, geometry.scrollHeight - geometry.innerHeight);
  if (travel < 200) {
    run.warn(
      "ROUTE_NOT_SCROLLABLE",
      `${route.slug} ${viewport.name}: travel is ${travel}px`,
      [site.origin + route.path],
    );
    return { frames: [], parallax: [] };
  }

  const frames = [];
  const parallaxSamples = [];
  let previousY = -1e9;

  for (let i = 0; i < frameCount; i++) {
    const targetY = Math.round((i * travel) / (frameCount - 1));

    for (let attempt = 0; attempt < 4; attempt++) {
      const current = await page.evaluate(() => Math.round(window.scrollY));
      const delta = targetY - current;
      if (Math.abs(delta) < 8) break;
      await page.mouse.wheel(0, delta * (attempt === 0 ? 1 : 1.35));
      // Settle: three consecutive identical samples, 100ms apart, 5s cap.
      const settled = await page.evaluate(async () => {
        const deadline = Date.now() + 5000;
        let last = -1;
        let same = 0;
        while (Date.now() < deadline) {
          const y = Math.round(window.scrollY);
          if (y === last) same++;
          else same = 0;
          last = y;
          if (same >= 2) return { y, settled: true };
          await new Promise((r) => setTimeout(r, 100));
        }
        return { y: Math.round(window.scrollY), settled: false };
      });
      if (!settled.settled && attempt === 3) {
        run.warn(
          "SCROLL_NEVER_SETTLED",
          `${route.slug} ${viewport.name} frame ${i}: still moving after 5s`,
          [site.origin + route.path],
        );
      }
    }

    const measured = await page.evaluate(
      (selectors) => {
        const y = Math.round(window.scrollY);
        const samples = [];
        for (const sel of selectors) {
          let n = 0;
          for (const el of document.querySelectorAll(sel)) {
            if (n++ >= 4) break;
            const cs = getComputedStyle(el);
            const m = new DOMMatrixReadOnly(
              cs.transform === "none" ? "" : cs.transform,
            );
            samples.push({
              selector: sel,
              nth: n - 1,
              attr: el.getAttribute("data-scroll-speed"),
              translateY: Number(m.m42.toFixed(3)),
              translateX: Number(m.m41.toFixed(3)),
              scale: Number(m.m11.toFixed(4)),
              opacity: Number(cs.opacity),
            });
          }
        }
        return { y, samples };
      },
      [
        "[data-scroll-speed]",
        "[data-scroll]",
        ".c-images-sequence_element",
        ".c-fadein-text_sticky",
        ".c-quote_background",
      ],
    );

    // Guard against sixteen copies of the hero.
    if (i > 0 && Math.abs(measured.y - previousY) <= 50) {
      run.warn(
        "SCROLL_DID_NOT_ADVANCE",
        `${route.slug} ${viewport.name} frame ${i}: measured y ${measured.y} is within 50px of the previous frame (${previousY}); aborting the remaining frames rather than emitting duplicates`,
        [site.origin + route.path],
      );
      break;
    }
    previousY = measured.y;

    const path = run.file(
      "scroll",
      `${route.slug}.${viewport.name}.${String(i).padStart(2, "0")}-y${measured.y}.jpg`,
    );
    await page.screenshot({ path, type: "jpeg", quality: 82 });
    const percent = travel > 0 ? Math.round((measured.y / travel) * 100) : 0;
    run.record(path, "scroll-frame", {
      pass: "live",
      viewport: viewport.name,
      route: route.slug,
      describes: `${route.slug} at ${viewport.name}, live pass, measured scrollY ${measured.y} of ${travel} (${percent}%). Requested ${targetY}. Filename carries the measured position, not the requested one.`,
    });
    frames.push({
      index: i,
      requestedY: targetY,
      measuredY: measured.y,
      percent,
      path: rel(path),
    });
    parallaxSamples.push(measured);
  }

  // Least-squares fit of every parallax element's translateY against scrollY.
  const byKey = {};
  for (const sample of parallaxSamples) {
    for (const s of sample.samples) {
      const key = `${s.selector}[${s.nth}]${s.attr ? ` data-scroll-speed=${s.attr}` : ""}`;
      (byKey[key] ||= []).push({ x: sample.y, y: s.translateY });
    }
  }
  const parallax = Object.entries(byKey)
    .map(([key, points]) => ({
      key,
      fit: fitLinear(points),
      points: points.slice(0, 20),
    }))
    .filter((p) => p.fit && Math.abs(p.fit.slope) > 0.0005);

  const reveals = await page.evaluate(() =>
    window.__forensics.reveals.slice(0, 400),
  );
  return { frames, parallax, reveals };
}

/** Background video: two seeked frames each, nothing downloaded. */
async function captureVideoEffects(page, run, { route }) {
  const inventory = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("video").forEach((v, i) => {
      // Lazily-assigned sources: the theme keeps the real URL in data-src until the element is in
      // view. Promote it so the element can actually be seeked.
      if (!v.currentSrc && v.dataset && v.dataset.src) {
        v.src = v.dataset.src;
        v.load();
      }
      v.setAttribute("data-forensics-index", String(i));
      const r = v.getBoundingClientRect();
      const p = v.parentElement ? getComputedStyle(v.parentElement) : null;
      out.push({
        index: i,
        currentSrc: v.currentSrc || v.src || null,
        dataSrc: v.dataset ? v.dataset.src || null : null,
        poster: v.poster || null,
        rendered: { width: Math.round(r.width), height: Math.round(r.height) },
        objectFit: getComputedStyle(v).objectFit,
        playsInline: v.playsInline,
        muted: v.muted,
        loop: v.loop,
        autoplay: v.autoplay,
        parentMixBlendMode: p ? p.mixBlendMode : null,
        parentFilter: p ? p.filter : null,
        parentBackgroundImage: p ? p.backgroundImage.slice(0, 220) : null,
        downloaded: false,
      });
    });
    return out;
  });

  for (const video of inventory) {
    if (!video.currentSrc) continue;
    video.frames = [];

    // Three of the four <video> elements on the ethnocare home route measure 0x0 when first reached:
    // they sit inside .c-video blocks that the theme has not yet sized. locator.screenshot() waits
    // for a visible, stable element and burns its full timeout on each one. Scroll the element into
    // view, let the theme size it, and re-measure before deciding whether a frame is even possible.
    const locator = page
      .locator(`video[data-forensics-index="${video.index}"]`)
      .first();
    try {
      await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
      await page.waitForTimeout(700);
    } catch {
      /* an element that cannot be scrolled to is handled by the rect check below */
    }
    const rect = await locator.boundingBox().catch(() => null);
    video.renderedAtCaptureTime = rect
      ? { width: Math.round(rect.width), height: Math.round(rect.height) }
      : null;
    if (!rect || rect.width < 8 || rect.height < 8) {
      run.warn(
        "VIDEO_NOT_RENDERED",
        `${route.slug} video ${video.index} measures ${rect ? `${Math.round(rect.width)}x${Math.round(rect.height)}` : "null"} even after scrolling it into view, so no frame can be taken. Its source, poster and parent compositing are still catalogued in effects.json.`,
        [video.currentSrc],
      );
      continue;
    }

    for (const t of [1.0, 3.0]) {
      const path = run.file(
        "effects",
        `video-${video.index}-t${String(t).replace(".", "_")}.${route.slug}.png`,
      );
      try {
        const ok = await page.evaluate(
          async ({ index, time }) => {
            const v = document.querySelector(
              `video[data-forensics-index="${index}"]`,
            );
            if (!v) return false;
            try {
              v.pause();
            } catch {}
            if (!Number.isFinite(v.duration) || v.duration === 0) {
              await new Promise((r) => {
                v.addEventListener("loadedmetadata", r, { once: true });
                setTimeout(r, 6000);
              });
            }
            if (!Number.isFinite(v.duration) || v.duration < time) return false;
            await new Promise((r) => {
              v.addEventListener("seeked", r, { once: true });
              v.currentTime = time;
              setTimeout(r, 6000);
            });
            return Math.abs(v.currentTime - time) < 0.6;
          },
          { index: video.index, time: t },
        );
        if (!ok) {
          run.warn(
            "VIDEO_SEEK_FAILED",
            `${route.slug} video ${video.index} would not seek to ${t}s`,
            [video.currentSrc],
          );
          continue;
        }
        await page.waitForTimeout(300);
        // A background video is routinely sized larger than the viewport — Divi renders this one at
        // 1600px wide inside a 1440px viewport so it can cover. An unclipped element screenshot of
        // something wider than the viewport pads the overflow with white, which looks like a broken
        // capture. Clip to the part that is actually on screen.
        const shot = locator;
        const box = await shot.boundingBox();
        const view = page.viewportSize();
        const overflows =
          box &&
          view &&
          (box.width > view.width ||
            box.height > view.height ||
            box.x < 0 ||
            box.y < 0);
        if (overflows) {
          await page.screenshot({
            path,
            clip: {
              x: Math.max(0, box.x),
              y: Math.max(0, box.y),
              width: Math.min(box.width, view.width - Math.max(0, box.x)),
              height: Math.min(box.height, view.height - Math.max(0, box.y)),
            },
          });
        } else {
          await shot.screenshot({ path });
        }
        run.record(path, "video-frame", {
          pass: "live",
          viewport: null,
          route: route.slug,
          describes: `Frame at t=${t}s of background video ${video.index} on ${route.slug}, captured by pausing and seeking the live <video> element. Anything the page paints on top of the video is in this frame too — it is the composited result, not the raw asset. Source catalogued, never downloaded: ${video.currentSrc}`,
        });
        video.frames.push({ t, path: rel(path) });
      } catch (error) {
        run.warn(
          "VIDEO_FRAME_FAILED",
          `${route.slug} video ${video.index} at ${t}s: ${error.message}`,
          [video.currentSrc],
        );
      }
    }
  }
  return inventory;
}

/**
 * particles.js.
 *
 * On www.andrewrinehart.us `particlesJS` is loaded and `window.pJSDom` is an empty array: the Divi
 * Particles plugin ships one static file containing five `particlesJS()` calls, each guarded on an
 * element id (`#divi-particles` .. `#divi-particles-4`) and none of those elements exist in this
 * site's markup. The canvas particle field is therefore installed but not running.
 *
 * Two artifacts result, and they must not be confused with each other:
 *
 *   `live`  — what the page actually runs. Records `instanceCount: 0` when that is the truth.
 *   `probe` — the plugin's own shipped config, parsed out of its own script and then instantiated in
 *             the page against the site's own particles.min.js, so the numbers written to disk are
 *             read back off a real live pJS instance rather than copied out of a file. Labelled with
 *             its provenance so nobody mistakes it for the running page.
 */
async function captureParticles(page, run, { site, route }) {
  const live = await page.evaluate(() => {
    const result = {
      particlesJsLoaded: typeof window.particlesJS === "function",
      instanceCount: Array.isArray(window.pJSDom) ? window.pJSDom.length : null,
      instances: [],
    };
    const clone = (v, depth) => {
      if (depth > 8) return "[depth]";
      if (v === null || typeof v !== "object")
        return typeof v === "function" ? undefined : v;
      if (typeof Node !== "undefined" && v instanceof Node)
        return "[dom:" + v.nodeName + "]";
      if (
        typeof CanvasRenderingContext2D !== "undefined" &&
        v instanceof CanvasRenderingContext2D
      )
        return "[ctx]";
      if (Array.isArray(v))
        return v.length > 20
          ? `[array:${v.length}]`
          : v.map((x) => clone(x, depth + 1));
      const o = {};
      for (const k of Object.keys(v)) {
        const c = clone(v[k], depth + 1);
        if (c !== undefined) o[k] = c;
      }
      return o;
    };
    for (const dom of window.pJSDom ?? []) {
      const p = dom.pJS;
      if (!p) continue;
      result.instances.push({
        canvas: clone(p.canvas, 0),
        particles: clone(p.particles, 0),
        interactivity: clone(p.interactivity, 0),
        retina_detect: p.retina_detect,
      });
    }
    return result;
  });

  const out = {
    live,
    probe: null,
    source: null,
    readThisFirst:
      "`live` is what the page runs. `source.authoredConfig` is what the plugin ships. `probe` is that " +
      "config read back off a real pJS instance instantiated in the page this run. authoredConfig and " +
      "probe disagree on purpose: particles.js with `retina_detect: true` multiplies size.value, " +
      "line_linked.distance, line_linked.width, move.speed and every interactivity mode distance by " +
      "window.devicePixelRatio at init. The probe ran at dpr 2, so those five families of number are " +
      "exactly doubled. Copy authoredConfig into a reimplementation; expect probe's values at 2x.",
  };

  if (live.instanceCount === 0 && site.particlesScript) {
    const response = await page.request
      .get(site.origin + site.particlesScript, { timeout: 15000 })
      .catch(() => null);
    if (response?.ok()) {
      const source = await response.text();
      const calls = parseParticlesCalls(source);
      out.source = {
        url: site.origin + site.particlesScript,
        bytes: source.length,
        downloaded: false,
        initCalls: calls.map((c) => c.target),
        guardElementIds: [
          ...new Set(
            [...source.matchAll(/find\('#([^']+)'\)/g)].map((m) => m[1]),
          ),
        ],
        allConfigsIdentical:
          calls.length > 1 &&
          calls.every(
            (c) => JSON.stringify(c.config) === JSON.stringify(calls[0].config),
          ),
        // The config exactly as the plugin ships it, parsed without executing it. Keep this beside
        // the probe: they legitimately disagree, and the reason is `retina_detect`.
        authoredConfig: calls[0]?.config ?? null,
      };
      out.source.guardElementsPresentOnPage = await page.evaluate(
        (ids) =>
          ids.map((id) => ({ id, present: !!document.getElementById(id) })),
        out.source.guardElementIds,
      );

      if (calls[0]?.config) {
        // Instantiate the plugin's own config against the site's own particles.min.js, then read the
        // resulting live pJS tree back. Measured, not transcribed.
        out.probe = await page.evaluate((config) => {
          const host = document.createElement("div");
          host.id = "__forensics-particles";
          host.style.cssText =
            "position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;pointer-events:none;background:#101014";
          document.body.appendChild(host);
          window.particlesJS("__forensics-particles", config);
          const dom = window.pJSDom[window.pJSDom.length - 1];
          if (!dom) return { error: "particlesJS() created no instance" };
          const p = dom.pJS;
          const clone = (v, depth) => {
            if (depth > 8) return "[depth]";
            if (v === null || typeof v !== "object")
              return typeof v === "function" ? undefined : v;
            if (typeof Node !== "undefined" && v instanceof Node)
              return "[dom:" + v.nodeName + "]";
            if (
              typeof CanvasRenderingContext2D !== "undefined" &&
              v instanceof CanvasRenderingContext2D
            )
              return "[ctx]";
            if (Array.isArray(v))
              return v.length > 20
                ? `[array:${v.length}]`
                : v.map((x) => clone(x, depth + 1));
            const o = {};
            for (const k of Object.keys(v)) {
              const c = clone(v[k], depth + 1);
              if (c !== undefined) o[k] = c;
            }
            return o;
          };
          return {
            canvas: {
              width: p.canvas.w,
              height: p.canvas.h,
              pxratio: p.canvas.pxratio,
              elementId: p.canvas.el?.id ?? null,
            },
            particlesLiveCount: p.particles.array.length,
            particles: clone(p.particles, 0),
            interactivity: clone(p.interactivity, 0),
            retina_detect: p.retina_detect,
            fn: { canvasSize: [p.canvas.w, p.canvas.h] },
          };
        }, calls[0].config);

        // Corroborating pixels. The config is the deliverable; these only show what it looks like.
        //
        // The filename carries the disclaimer because the `describes` field did
        // not survive contact with a reader. These frames show a dense, genuinely
        // handsome linked-node constellation, and an earlier pass named them
        // `particles-probe-frame{0,1}.png` with the caveat in prose. A reviewer
        // skimming the index for images to open saw an attractive file called
        // `particles-frame` and stopped reading — which is exactly how a spec
        // comes to specify an effect the reference site does not have. The live
        // background is a `<video>`; particles.js is enqueued here and never
        // initialises. Anything that makes the counterfactual legible only to
        // someone who reads the whole entry is not enough.
        for (const [i, wait] of [600, 2400].entries()) {
          await page.waitForTimeout(i === 0 ? wait : wait - 600);
          const ms = i === 0 ? 600 : 2400;
          const path = run.file(
            "effects",
            `SYNTHETIC-particles-never-renders-on-site-t${ms}ms.png`,
          );
          try {
            await page
              .locator("#__forensics-particles canvas")
              .first()
              .screenshot({ path });
            run.record(path, "synthetic-not-on-site", {
              pass: "live",
              viewport: null,
              route: route.slug,
              describes: `SYNTHETIC — THIS EFFECT DOES NOT RENDER ON THE LIVE SITE. particles.js field force-instantiated from the plugin's own shipped preset, ${ms}ms in, on a neutral #101014 backdrop. The live page runs zero particle instances and has zero canvas elements; its animated background is a <video>. Cite this only as a counterexample.`,
            });
          } catch (error) {
            run.warn("PARTICLE_FRAME_FAILED", `${error.message}`, [rel(path)]);
          }
        }

        await page.evaluate(() => {
          try {
            window.pJSDom.pop()?.pJS?.fn?.vendors?.destroypJS?.();
          } catch {}
          document.getElementById("__forensics-particles")?.remove();
        });
      }
    } else {
      run.warn(
        "PARTICLES_SCRIPT_UNREACHABLE",
        `${site.origin + site.particlesScript} did not return 200`,
        [site.origin + site.particlesScript],
      );
    }
  }

  return out;
}

/** Typewriter: the strings, the plugin's option parsing, and the cursor blink out of computed style. */
async function captureTypewriter(page, run, { site, route }) {
  const config = await page.evaluate(() => {
    const el = document.querySelector(".typed-me");
    if (!el) return null;
    const cursor = document.querySelector(".typed-cursor");
    const cs = cursor ? getComputedStyle(cursor) : null;
    const dataset = {};
    for (const k of Object.keys(el.dataset)) dataset[k] = el.dataset[k];
    const strings = Object.keys(dataset)
      .filter((k) => k.startsWith("string"))
      .sort()
      .map((k) => dataset[k]);
    const options = {};
    for (const k of Object.keys(dataset))
      if (!k.startsWith("string")) options[k] = Number.parseInt(dataset[k], 10);
    const elCs = getComputedStyle(el);
    return {
      selector: ".typed-me",
      // If the plugin read the strings out of data-string* they are here; if the markup carries
      // them as <br>-separated HTML instead, that is what the visible element holds right now.
      datasetStrings: strings,
      datasetOptions: options,
      renderedHtml: el.innerHTML.slice(0, 500),
      fontSizePx: elCs.fontSize,
      fontFamily: elCs.fontFamily,
      color: elCs.color,
      cursor: cursor
        ? {
            character: cursor.textContent,
            animationShorthand: cs.animation,
            animationName: cs.animationName,
            animationDuration: cs.animationDuration,
            animationIterationCount: cs.animationIterationCount,
            animationTimingFunction: cs.animationTimingFunction,
            fontSizePx: cs.fontSize,
            color: cs.color,
            opacity: cs.opacity,
          }
        : null,
    };
  });
  if (!config) return null;

  // Typed.js starts on document ready and, with a single string and no loop, is finished long before
  // the rest of this capture reaches it. Sampling the page as-is yields eight identical frames of the
  // completed string, which measures nothing. Reload and start the clock at load instead.
  await page.goto(site.origin + route.path, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });

  const frames = [];
  for (let i = 0; i < 8; i++) {
    const path = run.file(
      "effects",
      `typewriter-${String(i).padStart(2, "0")}-t${i * 500}ms.png`,
    );
    try {
      const text = await page
        .locator(".typed-me")
        .first()
        .innerText()
        .catch(() => "");
      await page.locator(".typed-me").first().screenshot({ path });
      run.record(path, "typewriter-frame", {
        pass: "live",
        viewport: null,
        route: route.slug,
        describes: `Typewriter element ${i * 500}ms into observation, currently reading "${text.replace(/\s+/g, " ").slice(0, 50)}".`,
      });
      frames.push({ index: i, tMs: i * 500, text, path: rel(path) });
    } catch (error) {
      run.warn("TYPEWRITER_FRAME_FAILED", error.message, [rel(path)]);
    }
    if (i < 7) await page.waitForTimeout(500);
  }
  config.frames = frames;
  return config;
}

/**
 * Page transitions.
 *
 * The contract for this pass anticipated Barba.js. Stage 1 recon found zero `data-barba` attributes
 * and no barba global on ethnocare.ca, so there is no DOM-swap to hook. What the theme does have is
 * a documented class-driven enter animation: `window.config.CSS_CLASS` names LOADING/READY/LOADED,
 * `html` carries `is-first-loaded is-loaded is-ready is-hero-animation-completed`, and sections
 * carry `u-anim-page`.
 *
 * So this instruments both possibilities and records which one actually happened: a rAF style
 * sampler plus a CDP screencast wrapped around a real click, with the navigation event itself
 * observed rather than assumed. Every transition runs in a fresh context because a warm client-side
 * router caches fetched pages in memory and a second traversal is measurably faster and not
 * comparable.
 */
async function captureTransition(browser, run, { site, transition, index }) {
  const viewport = VIEWPORTS.find((v) => v.name === "desktop");
  const videoDir = run.file("transitions", `t${index}`);
  const context = await newContext(browser, viewport, {
    recordVideo: {
      dir: videoDir,
      size: { width: viewport.width, height: viewport.height },
    },
  });
  await context.addInitScript(INIT_SCRIPT);
  const page = await context.newPage();

  const result = {
    index,
    from: transition.from,
    to: transition.to,
    link: transition.link,
    navigationEventFired: null,
    screencastFrames: 0,
    samples: [],
  };

  try {
    await page.goto(site.origin + transition.from, {
      waitUntil: "load",
      timeout: 45000,
    });
    await dismissOverlays(page);
    await page
      .waitForLoadState("networkidle", { timeout: 6000 })
      .catch(() => {});
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1200);

    const link = page.locator(transition.link).first();
    if (!(await link.count())) {
      run.warn(
        "TRANSITION_LINK_MISSING",
        `${transition.link} not found on ${transition.from}`,
        [site.origin + transition.from],
      );
      await context.close();
      return result;
    }

    // Hooks first. A screenshot loop is far too coarse for a 600-1200ms transition, and the numbers
    // are what a spec is written from; the frames only corroborate.
    await page.evaluate((selector) => {
      window.__t = { click: null, unload: null, samples: [], phases: [] };
      // Scope to main: the footer also carries .u-anim-page, and an unscoped query picks it first on
      // some routes, which silently samples the footer's opacity curve instead of the page's.
      const container =
        document.querySelector('[data-barba="container"]') ||
        document.querySelector("main .c-page_content") ||
        document.querySelector("main .u-anim-page") ||
        document.querySelector("main");
      const overlay = document.querySelector(
        ".c-preloader, .c-transition, [class*='transition'], [class*='preloader']",
      );
      window.__t.containerSelector = container
        ? (container.className || container.tagName).toString().slice(0, 80)
        : null;
      window.__t.overlaySelector = overlay
        ? (overlay.className || overlay.tagName).toString().slice(0, 80)
        : null;

      // Barba hooks, if barba turns out to be present after all.
      try {
        if (window.barba?.hooks) {
          for (const phase of ["before", "leave", "enter", "after"]) {
            window.barba.hooks[phase](() =>
              window.__t.phases.push({
                phase,
                t: Math.round(performance.now()),
              }),
            );
          }
          window.__t.barba = true;
        } else {
          window.__t.barba = false;
        }
      } catch {
        window.__t.barba = false;
      }

      window.addEventListener("beforeunload", () => {
        window.__t.unload = Math.round(performance.now());
      });

      const sample = () => {
        const c = container ? getComputedStyle(container) : null;
        const o = overlay ? getComputedStyle(overlay) : null;
        window.__t.samples.push({
          t: Math.round(
            performance.now() - (window.__t.click ?? performance.now()),
          ),
          containerOpacity: c ? Number(c.opacity) : null,
          containerTransform: c ? c.transform : null,
          containerFilter: c ? c.filter : null,
          overlayOpacity: o ? Number(o.opacity) : null,
          overlayTransform: o ? o.transform : null,
          scrollY: Math.round(window.scrollY),
          htmlClasses: document.documentElement.className,
          phase: window.__t.phases.length
            ? window.__t.phases[window.__t.phases.length - 1].phase
            : null,
        });
        if (window.__t.samples.length < 400) requestAnimationFrame(sample);
      };
      window.__startSampler = () => {
        window.__t.click = performance.now();
        requestAnimationFrame(sample);
      };
      void selector;
    }, transition.link);

    // CDP screencast. Every frame must be acknowledged or the stream stalls after a handful — that
    // omission is the standard failure and looks exactly like a slow site.
    const cdp = await context.newCDPSession(page);
    const frames = [];
    const t0 = Date.now();
    cdp.on("Page.screencastFrame", async ({ data, sessionId }) => {
      frames.push({ tMs: Date.now() - t0, data });
      try {
        await cdp.send("Page.screencastFrameAck", { sessionId });
      } catch {
        /* page gone */
      }
    });
    await cdp.send("Page.startScreencast", {
      format: "jpeg",
      quality: 80,
      everyNthFrame: 1,
      maxWidth: 1440,
      maxHeight: 900,
    });

    await page.evaluate(() => window.__startSampler());
    const navigationPromise = page
      .waitForNavigation({ timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    await link.click({ timeout: 8000, force: true });
    result.navigationEventFired = await navigationPromise;

    // Give the enter animation room whether or not a navigation happened.
    await page.waitForTimeout(2600);
    await cdp.send("Page.stopScreencast").catch(() => {});

    result.screencastFrames = frames.length;
    if (frames.length <= 20) {
      run.warn(
        "SCREENCAST_TOO_FEW_FRAMES",
        `transition ${index} produced ${frames.length} frames; expected more than 20`,
        [rel(videoDir)],
      );
    }
    for (const [i, frame] of frames.slice(0, 90).entries()) {
      const path = run.file(
        "transitions",
        `t${index}`,
        `f${String(i).padStart(3, "0")}-t${String(frame.tMs).padStart(4, "0")}.jpg`,
      );
      writeFileSync(path, Buffer.from(frame.data, "base64"));
      if (i % 12 === 0) {
        run.record(path, "transition-frame", {
          pass: "live",
          viewport: "desktop",
          route: `${transition.from} -> ${transition.to}`,
          describes: `CDP screencast frame ${i} at ${frame.tMs}ms after the click on ${transition.link}. ${frames.length} frames captured in total; every twelfth is indexed.`,
        });
      }
    }

    // A navigation destroys the old JS context, so read the sampler from whichever context survived.
    const samples = await page
      .evaluate(() => (window.__t ? window.__t : null))
      .catch(() => null);
    if (samples) {
      result.samples = samples.samples ?? [];
      result.phases = samples.phases ?? [];
      result.barbaPresent = samples.barba ?? false;
      result.containerSelector = samples.containerSelector ?? null;
      result.overlaySelector = samples.overlaySelector ?? null;
    } else {
      result.samplerLostToNavigation = true;
    }

    // If the click caused a real navigation, the interesting motion is the *enter* animation on a
    // cold load, which the sampler above cannot see because its context was destroyed. Measure that
    // separately, from goto to is-ready.
    if (result.navigationEventFired) {
      const enter = await measureEnterAnimation(context, site, transition.to);
      result.enterAnimation = enter;
    }
  } catch (error) {
    run.warn(
      "TRANSITION_CAPTURE_FAILED",
      `transition ${index} (${transition.from} -> ${transition.to}): ${error.message}`,
      [rel(videoDir)],
    );
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  // Playwright only finalises the webm on context close.
  try {
    const webm = readdirSync(videoDir).find((f) => f.endsWith(".webm"));
    if (webm) {
      run.record(resolve(videoDir, webm), "transition-video", {
        pass: "live",
        viewport: "desktop",
        route: `${transition.from} -> ${transition.to}`,
        describes: `Human-watchable recording of the ${transition.from} -> ${transition.to} traversal, including the click and the enter animation. Our own recording of our own browser, not a downloaded asset.`,
      });
    }
  } catch {
    /* no video dir */
  }

  const path = run.file("transitions", `t${index}`, "styles.json");
  writeJson(path, result);
  run.record(path, "transition-styles", {
    pass: "live",
    viewport: "desktop",
    route: `${transition.from} -> ${transition.to}`,
    describes: `rAF style sampler for ${transition.from} -> ${transition.to}: ${result.samples.length} ticks of container opacity/transform, overlay opacity/transform, scrollY and html classes, timestamped from the click. navigationEventFired=${result.navigationEventFired}. This is the artifact a transition spec is written from; the JPEGs corroborate it.`,
  });
  return result;
}

/** goto -> is-ready, sampled every frame. The enter animation of a cold page load. */
async function measureEnterAnimation(context, site, path) {
  const page = await context.newPage();
  const samples = [];
  try {
    await page.addInitScript(`
      window.__enter = { t0: performance.now(), samples: [] };
      const tick = () => {
        const el = document.querySelector('main .c-page_content') || document.querySelector('main .u-anim-page') || document.querySelector('main') || document.body;
        const pre = document.querySelector('.c-preloader, [class*="preloader"]');
        if (el) {
          const cs = getComputedStyle(el);
          const pcs = pre ? getComputedStyle(pre) : null;
          window.__enter.samples.push({
            t: Math.round(performance.now() - window.__enter.t0),
            htmlClasses: document.documentElement.className,
            opacity: Number(cs.opacity),
            transform: cs.transform,
            preloaderOpacity: pcs ? Number(pcs.opacity) : null,
            preloaderTransform: pcs ? pcs.transform : null
          });
        }
        if (window.__enter.samples.length < 300) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    `);
    await page.goto(site.origin + path, { waitUntil: "load", timeout: 45000 });
    await page.waitForTimeout(3200);
    const data = await page.evaluate(() => window.__enter?.samples ?? []);
    samples.push(...data);
  } catch {
    /* recorded by the caller through an empty sample list */
  } finally {
    await page.close().catch(() => {});
  }
  // Derive the class-flip timeline, which is the readable form of this data.
  const flips = [];
  let previous = "";
  for (const s of samples) {
    if (s.htmlClasses !== previous) {
      flips.push({
        tMs: s.t,
        classes: s.htmlClasses,
        opacity: s.opacity,
        transform: s.transform,
      });
      previous = s.htmlClasses;
    }
  }
  return {
    route: path,
    sampleCount: samples.length,
    classFlipTimeline: flips,
    samples: samples.slice(0, 200),
  };
}

// ---------------------------------------------------------------------------
// Site driver
// ---------------------------------------------------------------------------

async function captureSite(browser, siteKey) {
  const site = SITES[siteKey];
  const run = new Run(siteKey);
  // --clean removes only the directories and files this script writes, never the whole site
  // directory. Other tooling writes siblings into the same tree — a concurrent stack survey landed
  // `tech-stack.md` here during this pass — and an rmSync of the parent silently destroys them.
  if (CLEAN && existsSync(run.dir)) {
    for (const name of [
      "shots",
      "sections",
      "scroll",
      "states",
      "effects",
      "routes",
      "motion",
      "network",
      "transitions",
    ]) {
      const path = resolve(run.dir, name);
      if (existsSync(path)) rmSync(path, { recursive: true, force: true });
    }
    // notes.md is deliberately NOT in this list: it is hand-written prose about the capture, not a
    // generated artifact, and --clean destroying it is a silent loss of the only file in the tree a
    // human wrote.
    for (const name of ["index.json", "design-system.json"]) {
      const path = resolve(run.dir, name);
      if (existsSync(path)) rmSync(path, { force: true });
    }
  }
  mkdirSync(run.dir, { recursive: true });

  console.log(`\n== ${siteKey} — ${site.label}`);

  const sink = { console: [], errors: [], network: [] };
  const designSystem = {
    site: siteKey,
    origin: site.origin,
    label: site.label,
    capturedAt: new Date().toISOString(),
    routes: {},
  };
  const stateDeltas = [];
  const revealsAll = [];
  const scrollLinked = [];

  for (const viewport of VIEWPORTS) {
    const harPath =
      viewport.name === "desktop" ? run.file("network", "desktop.har") : null;
    const context = await newContext(
      browser,
      viewport,
      harPath
        ? { recordHar: { path: harPath, content: "omit", mode: "full" } }
        : {},
    );
    await context.addInitScript(INIT_SCRIPT);
    instrumentContext(context, sink);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    for (const route of site.routes) {
      try {
        // native pass: document flow restored, everything byte-stable.
        const native = await capturePass(page, run, {
          site,
          route,
          viewport,
          pass: "native",
        });
        designSystem.routes[route.slug] ??= {};
        designSystem.routes[route.slug][`${viewport.name}.native`] = {
          geometry: native.extract.geometry,
          customProperties: native.extract.customProperties,
          typography: native.extract.typography,
          colors: native.extract.colors.slice(0, 24),
          spacing: native.extract.spacing,
          motion: native.extract.motion,
          breakpoints: native.extract.breakpoints,
          libraries: native.extract.libraries,
          domOutline: native.extract.domOutline,
          siteConfig: native.extract.siteConfig ?? null,
        };

        if (FULL_VIEWPORTS.has(viewport.name)) {
          stateDeltas.push(
            ...(await captureStates(page, run, { site, route, viewport })),
          );

          // live pass: nothing torn down, so the parallax and reveal machinery is intact.
          await page.goto(site.origin + route.path, {
            waitUntil: "load",
            timeout: 45000,
          });
          await dismissOverlays(page);
          await settle(page, run, route.slug);

          const frameCount =
            route.scrollFrames?.[viewport.name] ??
            (viewport.name === "desktop" ? 10 : 6);
          const live = await captureScrollFrames(page, run, {
            site,
            route,
            viewport,
            frameCount,
          });
          if (live.parallax?.length) {
            scrollLinked.push({
              route: route.slug,
              viewport: viewport.name,
              elements: live.parallax,
            });
          }
          if (live.reveals?.length) {
            revealsAll.push({
              route: route.slug,
              viewport: viewport.name,
              events: live.reveals,
            });
          }

          // Effects, once per site, on the route that carries them.
          if (route.slug === "home" && viewport.name === "desktop") {
            const effects = {};
            if (site.effects.video)
              effects.video = await captureVideoEffects(page, run, {
                site,
                route,
              });
            if (site.effects.particles)
              effects.particles = await captureParticles(page, run, {
                site,
                route,
              });
            if (site.effects.typewriter)
              effects.typewriter = await captureTypewriter(page, run, {
                site,
                route,
              });
            if (site.effects.webglGradient) {
              effects.webglGradient = await page.evaluate(() => {
                const g = window.gradient;
                if (!g) return { present: false };
                const scalar = (v) =>
                  ["number", "string", "boolean"].includes(typeof v) ||
                  Array.isArray(v);
                return {
                  present: true,
                  globalName: "window.gradient",
                  keys: Object.keys(g),
                  scalars: Object.fromEntries(
                    Object.entries(g).filter(([, v]) => scalar(v)),
                  ),
                  rendererType: g.renderer ? g.renderer.constructor.name : null,
                  hasComposer: !!g.composer,
                  hasCustomPass: !!g.customPass,
                  uniforms: (() => {
                    try {
                      const u = g.material?.uniforms ?? {};
                      return Object.fromEntries(
                        Object.entries(u).map(([k, v]) => {
                          const val = v?.value;
                          if (val && typeof val === "object") {
                            if ("r" in val && "g" in val && "b" in val)
                              return [k, { r: val.r, g: val.g, b: val.b }];
                            if ("x" in val)
                              return [k, { x: val.x, y: val.y, z: val.z }];
                            return [k, "[object]"];
                          }
                          return [k, val ?? null];
                        }),
                      );
                    } catch (e) {
                      return { error: e.message };
                    }
                  })(),
                };
              });
              const canvasPath = run.file("effects", "webgl-gradient.png");
              try {
                await page
                  .locator(".c-gradient canvas")
                  .first()
                  .screenshot({ path: canvasPath });
                run.record(canvasPath, "webgl-frame", {
                  pass: "live",
                  viewport: "desktop",
                  route: "home",
                  describes: `The .c-gradient WebGL canvas, which is a three.js scene with an EffectComposer custom pass (window.gradient). This is the site's animated background, not a video and not a particle field.`,
                });
              } catch (error) {
                run.warn("WEBGL_FRAME_FAILED", error.message, [
                  rel(canvasPath),
                ]);
              }
            }
            if (site.effects.imageSequence) {
              effects.imageSequence = await page.evaluate(() => {
                return [...document.querySelectorAll(".c-images-sequence")].map(
                  (seq, i) => {
                    const canvas = seq.querySelector("canvas");
                    const steps = [
                      ...seq.querySelectorAll(".c-images-sequence-step"),
                    ].map((s) => ({
                      heading:
                        s
                          .querySelector("h1,h2,h3")
                          ?.textContent.trim()
                          .replace(/\s+/g, " ")
                          .slice(0, 80) ?? null,
                      classes: String(s.className).slice(0, 120),
                    }));
                    const sources = [
                      ...seq.querySelectorAll(
                        "[data-sequence-src], [data-src], img",
                      ),
                    ]
                      .map(
                        (e) =>
                          e.getAttribute("data-sequence-src") ||
                          e.getAttribute("data-src") ||
                          e.getAttribute("src"),
                      )
                      .filter(Boolean)
                      .slice(0, 8);
                    const r = seq.getBoundingClientRect();
                    return {
                      index: i,
                      heightPx: Math.round(r.height),
                      canvasBackingStore: canvas
                        ? { width: canvas.width, height: canvas.height }
                        : null,
                      canvasRendered: canvas
                        ? {
                            width: Math.round(
                              canvas.getBoundingClientRect().width,
                            ),
                            height: Math.round(
                              canvas.getBoundingClientRect().height,
                            ),
                          }
                        : null,
                      stepCount: steps.length,
                      steps,
                      sampleSources: sources,
                      downloaded: false,
                      dataAttributes: Object.fromEntries(
                        Object.entries(seq.dataset ?? {}).slice(0, 20),
                      ),
                    };
                  },
                );
              });
              for (const [i] of (effects.imageSequence ?? []).entries()) {
                const path = run.file("effects", `image-sequence-${i}.png`);
                try {
                  await page
                    .locator(".c-images-sequence canvas")
                    .nth(i)
                    .screenshot({ path });
                  run.record(path, "image-sequence-frame", {
                    pass: "live",
                    viewport: "desktop",
                    route: "home",
                    describes: `Canvas of scroll-scrubbed image sequence ${i} on the home route, at whatever frame the current scroll position selects.`,
                  });
                } catch (error) {
                  run.warn("IMAGE_SEQUENCE_FRAME_FAILED", error.message, [
                    rel(path),
                  ]);
                }
              }
            }
            const effectsPath = run.file("effects", "effects.json");
            writeJson(effectsPath, effects);
            run.record(effectsPath, "effects", {
              pass: "live",
              viewport: "desktop",
              route: "home",
              describes: `Every signature effect on ${siteKey}, measured: ${Object.keys(effects).join(", ")}. Contains source URLs and rendered geometry for each; no third-party byte was written to disk.`,
            });
            if (effects.particles) {
              const particlesPath = run.file(
                "effects",
                "particles.config.json",
              );
              writeJson(particlesPath, effects.particles);
              run.record(particlesPath, "particles-config", {
                pass: "live",
                viewport: "desktop",
                route: "home",
                describes: `particles.js configuration. \`live\` records what the page actually runs (instanceCount ${effects.particles.live.instanceCount}); \`probe\` is the plugin's own shipped config read back off a real pJS instance this run instantiated. Read the provenance before copying numbers.`,
              });
            }
            if (effects.typewriter) {
              const twPath = run.file("effects", "typewriter.json");
              writeJson(twPath, effects.typewriter);
              run.record(twPath, "typewriter-config", {
                pass: "live",
                viewport: "desktop",
                route: "home",
                describes: `Typewriter strings, plugin options and the cursor's computed animation shorthand (the blink rate, which always reads straight out of getComputedStyle even when the instance is unreachable).`,
              });
            }
          }
        }
      } catch (error) {
        run.warn(
          "ROUTE_FAILED",
          `${route.slug} at ${viewport.name}: ${error.message}`,
          [site.origin + route.path],
        );
      }
    }

    // reduced-motion, desktop + home route only.
    if (viewport.name === "desktop") {
      const rmContext = await newContext(browser, viewport, {
        reducedMotion: "reduce",
      });
      await rmContext.addInitScript(INIT_SCRIPT);
      const rmPage = await rmContext.newPage();
      try {
        await rmPage.goto(site.origin + "/", {
          waitUntil: "load",
          timeout: 45000,
        });
        await dismissOverlays(rmPage);
        await settle(rmPage, run, "home (reduced-motion)");
        const path = run.file("shots", "reduced-motion.desktop.png");
        await rmPage.screenshot({ path, animations: "disabled" });
        const blanks = await rmPage.evaluate(() => {
          // Sections still at opacity 0 after load are reveals that never fired.
          const out = [];
          for (const el of document.querySelectorAll(
            "section, .c-fadein-text, .c-images-sequence, .et_pb_section, [class*='anim']",
          )) {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            if (
              r.height > 100 &&
              (Number(cs.opacity) < 0.05 || cs.visibility === "hidden")
            ) {
              out.push({
                selector: String(el.className).slice(0, 90),
                opacity: cs.opacity,
                visibility: cs.visibility,
                height: Math.round(r.height),
              });
            }
          }
          return out;
        });
        run.record(path, "reduced-motion", {
          pass: "native",
          viewport: "desktop",
          route: "home",
          describes: `Home route under prefers-reduced-motion: reduce. ${blanks.length} section(s) remained invisible, meaning their reveal never fired under reduced motion.`,
        });
        if (blanks.length) {
          run.warn(
            "REDUCED_MOTION_BLANK_SECTIONS",
            `${blanks.length} section(s) stay at opacity 0 under prefers-reduced-motion on ${siteKey}`,
            [rel(path)],
          );
        }
        designSystem.reducedMotion = {
          blankSections: blanks,
          screenshot: rel(path),
        };
      } catch (error) {
        run.warn("REDUCED_MOTION_FAILED", error.message, []);
      } finally {
        await rmPage.close().catch(() => {});
        await rmContext.close().catch(() => {});
      }
    }

    await page.close().catch(() => {});
    await context.close().catch(() => {});
    if (harPath && existsSync(harPath)) {
      run.record(harPath, "har", {
        pass: "native",
        viewport: "desktop",
        route: null,
        describes: `Full network waterfall for every desktop route: headers, sizes and timings, with content omitted. No response body is on disk.`,
      });
    }
  }

  // Transitions, each in a fresh context.
  for (const [index, transition] of site.transitions.entries()) {
    console.log(
      `    transition ${index}: ${transition.from} -> ${transition.to}`,
    );
    await captureTransition(browser, run, { site, transition, index });
  }

  // ---- derived files -------------------------------------------------------
  const dsPath = run.file("design-system.json");
  writeJson(dsPath, designSystem);
  run.record(dsPath, "design-system", {
    pass: "native",
    viewport: null,
    route: null,
    describes: `Every route's measurements merged into one file: custom properties, typography, colour ranking, spacing clusters, motion fingerprints, breakpoints, libraries and section outlines, keyed route -> viewport.pass.`,
  });

  if (stateDeltas.length) {
    const path = run.file("states", "deltas.json");
    writeJson(path, stateDeltas);
    run.record(path, "state-deltas", {
      pass: "native",
      viewport: null,
      route: null,
      describes: `Computed-style diffs for every hover, focus and scrolled-header state: only the properties that changed, each with its from/to value and the transition duration and timing function that carries it. Highest value per byte in this tree.`,
    });
  }

  if (revealsAll.length) {
    const path = run.file("motion", "reveals-observed.json");
    writeJson(path, revealsAll);
    const totals = revealsAll.reduce((a, r) => a + r.events.length, 0);
    // A single median over every flip is meaningless here: `lenis-scrolling` toggles on and off
    // hundreds of times per scroll and drowns the twenty-odd flips that are actually reveals. The
    // per-class median is the number a reveal threshold is written from.
    const byClass = {};
    for (const group of revealsAll) {
      for (const event of group.events) {
        for (const gained of event.gained) {
          (byClass[gained] ||= []).push(event.viewportFraction);
        }
      }
    }
    const thresholds = Object.entries(byClass)
      .map(([className, fractions]) => {
        const usable = fractions
          .filter((f) => f > 0 && f < 1.5)
          .sort((a, b) => a - b);
        return {
          className,
          events: fractions.length,
          usableSamples: usable.length,
          medianViewportFraction: usable.length
            ? usable[Math.floor(usable.length / 2)]
            : null,
          minViewportFraction: usable.length ? usable[0] : null,
          maxViewportFraction: usable.length ? usable[usable.length - 1] : null,
        };
      })
      .sort((a, b) => b.events - a.events);
    writeJson(path, { thresholdsByClass: thresholds, groups: revealsAll });
    const headline = thresholds.find(
      (t) => t.medianViewportFraction !== null && t.usableSamples >= 5,
    );
    run.record(path, "reveals-observed", {
      pass: "live",
      viewport: null,
      route: null,
      describes: `${totals} class flips recorded empirically during the live scroll passes, each with the scroll position, the element's viewport-relative top and the derived viewportFraction, summarised per class in thresholdsByClass. ${headline ? `The load-bearing one: .${headline.className} fires at a median ${headline.medianViewportFraction} of viewport height across ${headline.usableSamples} samples.` : "No class had enough usable samples to state a threshold."}`,
    });
  }

  if (scrollLinked.length) {
    const path = run.file("motion", "scroll-linked.json");
    writeJson(path, scrollLinked);
    run.record(path, "scroll-linked", {
      pass: "live",
      viewport: null,
      route: null,
      describes: `Least-squares fits of each parallax element's translateY against scrollY. r2 above 0.99 means true linear parallax at the given slope; a poor fit means eased or clamped and the spec should say so rather than naming a ratio the site does not use.`,
    });
  }

  // Network inventory, joined to the DOM.
  const assets = {
    fonts: [],
    video: [],
    images: [],
    scripts: [],
    stylesheets: [],
    other: [],
  };
  for (const entry of sink.network) {
    const bucket =
      entry.resourceType === "font"
        ? "fonts"
        : entry.resourceType === "media" ||
            /\.(mp4|webm|m4v|mov)(\?|$)/i.test(entry.url)
          ? "video"
          : entry.resourceType === "image"
            ? "images"
            : entry.resourceType === "script"
              ? "scripts"
              : entry.resourceType === "stylesheet"
                ? "stylesheets"
                : "other";
    assets[bucket].push({ ...entry, downloaded: false });
  }
  const assetsPath = run.file("network", "assets.json");
  writeJson(assetsPath, {
    note: "Every entry is a catalogue record. `downloaded: false` on all of them is literal: this script wrote no third-party byte to disk.",
    counts: Object.fromEntries(
      Object.entries(assets).map(([k, v]) => [k, v.length]),
    ),
    ...assets,
  });
  run.record(assetsPath, "assets", {
    pass: null,
    viewport: null,
    route: null,
    describes: `${sink.network.length} network responses grouped into fonts/video/images/scripts/stylesheets, each with status, content-type, header-reported size and any version string found transiently in a script body. Nothing was stored.`,
  });

  const consolePath = run.file("network", "console.json");
  writeJson(consolePath, { console: sink.console, pageErrors: sink.errors });
  run.record(consolePath, "console", {
    pass: null,
    viewport: null,
    route: null,
    describes: `${sink.console.length} console messages and ${sink.errors.length} uncaught page errors across the whole capture. A reference site throwing errors tells you which of its libraries is fragile.`,
  });

  const indexPath = run.file("index.json");
  writeJson(indexPath, {
    site: siteKey,
    origin: site.origin,
    label: site.label,
    capturedAt: new Date().toISOString(),
    playwright: "@playwright/test 1.61.1",
    viewports: VIEWPORTS,
    routes: site.routes,
    artifactCount: run.artifacts.length,
    warningCount: run.warnings.length,
    artifacts: run.artifacts,
    warnings: run.warnings,
  });

  console.log(
    `   ${run.artifacts.length} artifacts, ${run.warnings.length} warnings`,
  );
  return run;
}

// ---------------------------------------------------------------------------
// --check: no browser, no network, safe in a sandbox
// ---------------------------------------------------------------------------

function runCheck() {
  const sites = ONLY_SITE ? [ONLY_SITE] : Object.keys(SITES);
  let artifacts = 0;
  let problems = 0;

  for (const siteKey of sites) {
    const indexPath = resolve(outRoot, siteKey, "index.json");
    if (!existsSync(indexPath)) {
      console.error(
        `${rel(indexPath)} does not exist — run: pnpm reference:capture`,
      );
      problems++;
      continue;
    }
    const index = JSON.parse(readFileSync(indexPath, "utf8"));
    for (const artifact of index.artifacts) {
      const path = resolve(root, artifact.path);
      if (!existsSync(path)) {
        console.error(`missing: ${artifact.path}`);
        problems++;
        continue;
      }
      if (statSync(path).size !== artifact.bytes) {
        console.error(
          `size drift: ${artifact.path} is ${statSync(path).size}, index says ${artifact.bytes}`,
        );
        problems++;
        continue;
      }
      if (sha256File(path) !== artifact.sha256) {
        console.error(`sha256 drift: ${artifact.path}`);
        problems++;
        continue;
      }
      if (!artifact.describes || artifact.describes.length < 20) {
        console.error(`unusable describes: ${artifact.path}`);
        problems++;
      }
      artifacts++;
    }
    // The download ban, enforced rather than asserted: no third-party binary may be in the tree.
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const p = resolve(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (!/\.(png|jpg|jpeg|json|webm|md|har)$/i.test(name)) {
          console.error(`unexpected file type in the artifact tree: ${rel(p)}`);
          problems++;
        }
      }
    };
    walk(resolve(outRoot, siteKey));
    console.log(
      `  ${siteKey}: ${index.artifacts.length} artifacts, ${index.warnings.length} warnings`,
    );
  }

  if (problems) {
    console.error(`\n${problems} problem(s)`);
    process.exit(1);
  }
  console.log(`${artifacts} artifacts verified`);
}

// ---------------------------------------------------------------------------

async function main() {
  if (CHECK) return runCheck();

  const siteKeys = ONLY_SITE ? [ONLY_SITE] : Object.keys(SITES);
  for (const key of siteKeys) {
    if (!SITES[key]) {
      console.error(
        `unknown site ${key}; known: ${Object.keys(SITES).join(", ")}`,
      );
      process.exit(1);
    }
  }

  const browser = await chromium.launch({
    args: [
      "--autoplay-policy=no-user-gesture-required",
      "--disable-features=CalculateNativeWinOcclusion",
    ],
  });
  const runs = [];
  try {
    for (const key of siteKeys) runs.push(await captureSite(browser, key));
  } finally {
    await browser.close();
  }

  // Top-level index across every site whose capture survives on disk.
  //
  // This MERGES rather than replaces, and the distinction is not academic: it
  // cost a whole run once. `runs` holds only the sites captured by THIS
  // invocation, so a `--site www.andrewrinehart.us` pass used to rewrite the
  // root index with that site alone — silently deleting ethnocare's 530
  // artifacts from the only file that lists what exists. The per-site indexes
  // were both intact the whole time; the entry point was the thing that lied,
  // and it lied in the direction nobody checks, because a 282-byte file that
  // parses looks healthy.
  //
  // A site is carried forward only if its per-site index is still readable.
  // That keeps `--clean` honest: delete a site's directory and it leaves the
  // root index on the next run, rather than lingering as a dangling entry.
  const priorSites = (() => {
    const priorPath = resolve(outRoot, "index.json");
    if (!existsSync(priorPath)) return [];
    try {
      return JSON.parse(readFileSync(priorPath, "utf8"))?.sites ?? [];
    } catch {
      // A truncated or hand-edited root index must not abort a capture that
      // otherwise succeeded — the sites in `runs` are still rewritten below.
      return [];
    }
  })();

  const bySite = new Map();
  for (const prior of priorSites) {
    const priorIndex = resolve(outRoot, prior.site, "index.json");
    if (!existsSync(priorIndex)) continue;
    bySite.set(prior.site, prior);
  }
  for (const r of runs) {
    bySite.set(r.siteKey, {
      site: r.siteKey,
      index: rel(resolve(r.dir, "index.json")),
      artifactCount: r.artifacts.length,
      warningCount: r.warnings.length,
      capturedAt: new Date().toISOString(),
    });
  }

  const sites = [...bySite.values()].sort((a, b) =>
    a.site.localeCompare(b.site),
  );
  const all = {
    capturedAt: new Date().toISOString(),
    sites,
    artifactCount: sites.reduce((a, s) => a + (s.artifactCount ?? 0), 0),
    warningCount: sites.reduce((a, s) => a + (s.warningCount ?? 0), 0),
  };
  writeJson(resolve(outRoot, "index.json"), all);
  console.log(
    `\n${all.artifactCount} artifacts, ${all.warningCount} warnings across ${runs.length} site(s)`,
  );
}

await main();
