export type RetryOptions = {
  retries?: number;
  delayMs?: number;
};

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  retries: 2,
  delayMs: 400,
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export const describeError = (error: unknown, fallback: string) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Reconnect and try again.";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export async function fetchJsonWithRetry(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options?: RetryOptions
) {
  const { retries, delayMs } = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let attempt = 0;

  while (attempt <= retries) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("You appear to be offline. Reconnect and try again.");
    }
    try {
      const response = await fetch(input, init);
      const result = await readJson(response);
      if (response.ok && result === null && response.status !== 204 && response.status !== 205) {
        throw new Error("Invalid JSON response.");
      }
      if (!response.ok) {
        const message = result?.error || `Server error (${response.status}).`;
        if (response.status >= 500 || response.status === 429) {
          throw new Error(message);
        }
      }
      return { response, result };
    } catch (error) {
      if (attempt >= retries) {
        throw error;
      }
      const backoff = delayMs * Math.pow(2, attempt);
      await sleep(backoff);
      attempt += 1;
    }
  }

  throw new Error("Retry attempts exhausted.");
}
