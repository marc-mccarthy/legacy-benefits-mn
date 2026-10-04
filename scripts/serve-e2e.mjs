#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env["PORT"] ?? 3100);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "out");
const bundle = join(repoRoot, "api-bundle", "index.mjs");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".vtt": "text/vtt; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
  ".ics": "text/calendar; charset=utf-8",
};

if (!existsSync(outDir)) {
  process.stderr.write(
    "serve-e2e: out/ does not exist — run the build first\n",
  );
  process.exit(1);
}

let apiHandler = null;
if (existsSync(bundle)) {
  ({ handler: apiHandler } = await import(bundle));
}

function resolveFile(pathname) {
  const candidate = resolve(
    join(outDir, normalize(decodeURIComponent(pathname))),
  );
  if (!candidate.startsWith(outDir)) return null;

  for (const path of [
    candidate,
    `${candidate}.html`,
    join(candidate, "index.html"),
  ]) {
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  return null;
}

function sendFile(res, path, status = 200) {
  res.writeHead(status, {
    "content-type": TYPES[extname(path)] ?? "application/octet-stream",
    "content-length": statSync(path).size,
  });
  createReadStream(path).pipe(res);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname.startsWith("/api/")) {
    if (!apiHandler) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end('{"error":"api bundle not built"}');
      return;
    }

    try {
      const body = await readBody(req);
      const result = await apiHandler({
        rawPath: url.pathname,
        rawQueryString: url.search.replace(/^\?/, ""),
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(", ") : (value ?? ""),
          ]),
        ),
        body: body.length ? body.toString("utf8") : undefined,
        isBase64Encoded: false,
        requestContext: {
          http: { method: req.method ?? "GET", path: url.pathname },
        },
      });

      res.writeHead(result.statusCode, result.headers);
      res.end(result.body);
    } catch (error) {
      console.error(error);
      if (!res.headersSent)
        res.writeHead(500, { "content-type": "application/json" });
      res.end('{"error":"api handler failed"}');
    }
    return;
  }

  const file = resolveFile(url.pathname);
  if (file) {
    sendFile(res, file);
    return;
  }

  const notFound = join(outDir, "404.html");
  if (existsSync(notFound)) {
    sendFile(res, notFound, 404);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`serve-e2e: http://127.0.0.1:${PORT}\n`);
});
