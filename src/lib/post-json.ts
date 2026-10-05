export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

export async function postJson(url: string, payload: unknown) {
  const body = JSON.stringify(payload);
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-amz-content-sha256": await sha256Hex(body),
    },
    body,
  });
}
