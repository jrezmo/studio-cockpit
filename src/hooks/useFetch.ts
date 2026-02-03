import { useCallback, useEffect, useRef, useState } from "react";
import { describeError, fetchJsonWithRetry } from "@/lib/api/request";

export type UseFetchOptions<T> = {
  init?: RequestInit;
  enabled?: boolean;
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

export function useFetch<T>(url: string, options: UseFetchOptions<T> = {}) {
  const {
    init,
    enabled = true,
    retries,
    delayMs,
    errorMessage = "Unable to load data.",
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const fetchData = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");

    const requestInit = {
      cache: init?.cache ?? "no-store",
      ...init,
      signal: controller.signal,
    };

    try {
      const { result } = await fetchJsonWithRetry(
        url,
        requestInit,
        { retries, delayMs }
      );
      if (!mountedRef.current) return;

      const parsed = result as ApiResponse<T> | null;
      if (parsed?.ok && parsed.data) {
        setData(parsed.data);
        onSuccessRef.current?.(parsed.data);
      } else {
        const message = parsed?.error || errorMessage;
        setError(message);
        onErrorRef.current?.(message);
      }
    } catch (errorThrown) {
      if (!mountedRef.current) return;
      const isAbortError =
        typeof errorThrown === "object" &&
        errorThrown !== null &&
        "name" in errorThrown &&
        (errorThrown as { name?: string }).name === "AbortError";
      if (isAbortError) return;
      const message = describeError(errorThrown, errorMessage);
      setError(message);
      onErrorRef.current?.(message);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [delayMs, errorMessage, init, retries, url]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      void fetchData();
    }
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [enabled, fetchData]);

  return { data, error, loading, refetch: fetchData };
}
