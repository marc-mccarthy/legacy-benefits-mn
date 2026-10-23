// Git exports GIT_INDEX_FILE and GIT_DIR to hooks; fixture repos spawned by tests must not inherit them.
for (const key of Object.keys(process.env)) {
  if (key.startsWith("GIT_")) delete process.env[key];
}
