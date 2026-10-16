// Hardcoded so the bearer token can never be sent to another host.
const BASE_URL = "https://www.medicareproapp.com/api/v1";
const TIMEOUT_MS = 4000;
const RETRYABLE_STATUSES = new Set([401, 403, 408, 429]);
const TRANSPORT_ERROR_NAMES = new Set([
  "TypeError",
  "AbortError",
  "TimeoutError",
]);

export type CallSpec = {
  method: "GET" | "POST";
  path: string;
  template: string;
  body?: unknown;
};

export type Reply = { status: number; data: unknown };

export type Call = (spec: CallSpec) => Promise<Reply>;

export class RelayError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly status?: number,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTransportError(error: unknown): error is Error {
  return error instanceof Error && TRANSPORT_ERROR_NAMES.has(error.name);
}

function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(status) || status >= 500;
}

function describe(spec: CallSpec): string {
  return `${spec.method} ${spec.template}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // An empty or non-JSON 2xx body means "no data"; callers decide what that implies.
    return undefined;
  }
}

async function send(
  token: string,
  spec: CallSpec,
): Promise<{ status: number; text: string }> {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    accept: "application/json",
  };
  if (spec.body !== undefined) headers["content-type"] = "application/json";
  try {
    const res = await fetch(`${BASE_URL}${spec.path}`, {
      method: spec.method,
      headers,
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status < 200 || res.status > 299) {
      await res.body?.cancel();
      return { status: res.status, text: "" };
    }
    return { status: res.status, text: await res.text() };
  } catch (error) {
    // Messages from fetch can echo request details, so only the error class is used.
    if (!isTransportError(error)) throw error;
    const kind = error.name === "TypeError" ? "network error" : "timeout";
    throw new RelayError(`${kind} on ${describe(spec)}`, true);
  }
}

export function makeCall(token: string): Call {
  return async (spec) => {
    const { status, text } = await send(token, spec);
    if (status < 200 || status > 299) {
      throw new RelayError(
        `HTTP ${status} on ${describe(spec)}`,
        isRetryableStatus(status),
        status,
      );
    }
    return { status, data: parseJson(text) };
  };
}
