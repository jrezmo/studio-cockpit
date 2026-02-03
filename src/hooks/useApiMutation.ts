import { useCallback, useState } from "react";
import { describeError, fetchJsonWithRetry } from "@/lib/api/request";

export type UseApiMutationOptions<T> = {
  retries?: number;
  delayMs?: number;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (message: string) => void;
};

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

type MutationResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function useApiMutation<T>(
  url: string,
  options: UseApiMutationOptions<T> = {}
) {
  const {
    retries,
    delayMs,
    errorMessage = "Unable to save changes.",
    onSuccess,
    onError,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mutate = useCallback(
    async (body: unknown, init?: RequestInit): Promise<MutationResult<T>> => {
      setLoading(true);
      setError("");

      try {
        const { result } = await fetchJsonWithRetry(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            ...init,
          },
          { retries, delayMs }
        );

        const parsed = result as ApiResponse<T> | null;
        if (parsed?.ok && parsed.data) {
          onSuccess?.(parsed.data);
          return { ok: true, data: parsed.data };
        }

        const message = parsed?.error || errorMessage;
        setError(message);
        onError?.(message);
        return { ok: false, error: message };
      } catch (errorThrown) {
        const message = describeError(errorThrown, errorMessage);
        setError(message);
        onError?.(message);
        return { ok: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [delayMs, errorMessage, onError, onSuccess, retries, url]
  );

  return { mutate, loading, error };
}
