"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseFetchResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  refetch: () => void;
}

/**
 * Lightweight data fetcher with manual refetch. Uses an AbortController so
 * navigating away or refetching mid-flight cancels stale requests.
 */
export function useFetch<T>(url: string | null): UseFetchResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(!!url);
  const [error, setError] = useState<string | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!url) {
      setData(undefined);
      setLoading(false);
      setError(undefined);
      return;
    }
    setLoading(true);
    setError(undefined);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { Accept: "application/json" },
        });
        const text = await res.text();
        let json: unknown = undefined;
        try {
          json = text ? JSON.parse(text) : undefined;
        } catch {
          json = undefined;
        }
        if (!res.ok) {
          const msg =
            (json && typeof json === "object" && "error" in json
              ? String((json as { error?: unknown }).error)
              : undefined) ||
            `Request failed (${res.status})`;
          throw new Error(msg);
        }
        setData(json as T);
        setError(undefined);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Network error";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [url, tick]);

  return { data, loading, error, refetch };
}

/**
 * Mutation helper. Throws on non-2xx responses; returns parsed JSON.
 */
export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    json = undefined;
  }
  if (!res.ok) {
    const msg =
      (json && typeof json === "object" && "error" in json
        ? String((json as { error?: unknown }).error)
        : undefined) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

/** Format an ISO date / Date for compact display. Returns "" if null/invalid. */
export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Format an ISO date / Date for short date + time. */
export function fmtDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Truncate a string to `n` chars with an ellipsis. */
export function truncate(s: string, n = 60): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
