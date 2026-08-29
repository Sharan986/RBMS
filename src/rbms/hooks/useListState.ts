import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import type { SortState } from "../components/DataTable";

/** Reads initial filter values from the URL query string (deep links from the dashboard/exceptions). */
export function useInitialSearch(): Record<string, string> {
  const search = useRouterState({ select: (s) => s.location.search }) as unknown;
  if (!search || typeof search !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(search as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number") out[k] = String(v);
  }
  return out;
}

export function useDebounced<T>(value: T, ms = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Search + filters + sort + pagination state for a list screen. */
export function useListState(initial: { sortBy: string; sortDir?: "asc" | "desc"; pageSize?: number }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortState>({ sortBy: initial.sortBy, sortDir: initial.sortDir ?? "asc" });
  const pageSize = initial.pageSize ?? 10;

  useEffect(() => setPage(1), [debouncedSearch]);

  return {
    search,
    setSearch,
    debouncedSearch,
    page,
    setPage,
    pageSize,
    sort,
    setSort: (s: SortState) => {
      setSort(s);
      setPage(1);
    },
  };
}
