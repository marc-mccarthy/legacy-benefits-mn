# Development

## Running the site

```sh
pnpm install
pnpm dev
```

The site reads its content from typed modules under `src/content/`. No database
is needed to run or build it.

## Building

```sh
pnpm build
```

`next.config.ts` sets `output: "export"`, so the build writes static HTML to
`out/`. Route files are emitted flat: `out/learn.html` is the learning index and
`out/learn/<slug>.html` are the articles, so a `learn.html` file and a `learn/`
directory exist side by side.

### `NEXT_PUBLIC_*` variables must be set at build time

These are read while the HTML is generated and are baked into it. A value
supplied only to the Lambda at runtime never reaches a page:

- `NEXT_PUBLIC_SITE_URL` — the origin in `sitemap.xml`, `robots.txt` and the
  JSON-LD. Unset, `getSiteUrl()` returns `https://example.invalid`.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` — the widget is rendered into static HTML.
- `NEXT_PUBLIC_GTM_ID`
- `NEXT_PUBLIC_CALENDLY_URL`
- `NEXT_PUBLIC_MEDIA_HOST`

`BUSINESS_NAME`, `BUSINESS_PHONE`, `BUSINESS_EMAIL` and `BUSINESS_ADDRESS` are
also read at build time; `src/content/site.ts` is the fallback for each.

## The API

The five request-reading handlers live in `src/api/`, outside `src/app/`,
because `output: "export"` does not support route handlers that read from
`Request`. They ship as a separate Lambda bundle:

```sh
node scripts/build-api-bundle.mjs
```

That writes `api-bundle/index.mjs`, exporting `handler`. The script imports the
result and fails if `handler` is missing, so a bundle that cannot load is a
build failure rather than a runtime one.

## Tests

```sh
pnpm test         # every vitest project
pnpm test:unit    # no database required
pnpm test:e2e     # playwright, needs out/ and api-bundle/ built first
```

`pnpm test:integration` is the only project that requires a database. It needs
`DATABASE_URL` pointing at one that has had `pnpm drizzle:migrate` applied.

`pnpm test:e2e` runs against `scripts/serve-e2e.mjs`, which serves `out/` and
routes `/api/*` to the bundle. Build both before running it.

## Turnstile: blank and `REPLACE_ME` are not the same

`env()` in `src/lib/env.ts` treats a blank value as absent, which is the
supported "not configured" state — `verifyTurnstile` then skips verification.

`REPLACE_ME` is a non-empty string, so it is treated as configured.
`verifyTurnstile` calls Cloudflare with it, Cloudflare rejects it, and **every
form submission returns 403**. If submissions are failing with
`Could not verify that you are human`, check `TURNSTILE_SECRET_KEY` for a
placeholder before looking anywhere else.
