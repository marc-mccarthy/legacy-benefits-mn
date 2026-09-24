# Do not write requirements into this repository

Never write a comment, a `description`, or a document that says what this application
is, should have, must have, or needs — for correctness, security, compliance,
durability, cost or scale. No positioning claims either: not "regulated", not "demo",
not "production". Never warn a future reader not to remove something.

Delete that prose when you find it, including prose you did not write. Earlier passes
left comments asserting features the owner had already deleted; each agent that
followed restored them, citing the comments as authority. List what you deleted.

If you think something is missing, say it in chat. Comments explain a non-obvious
mechanism in a line or two. Nothing else.

A task document — a brief, a handoff prompt, a plan for one job — is allowed. The
test is whether it expires: a requirement does not, a task does. Name the task in the
filename, keep it untracked, delete it when the work lands.

An explicit instruction from the owner outranks this file. Do it, and say in chat
which rule it crosses. Refusing a
person to obey a document is the same failure as obeying a comment over a person.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
