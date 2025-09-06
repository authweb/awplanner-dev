import { useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

export type BoardFilters = {
  q: string;
  priorities: number[];      // [0..4]
  dueFrom?: string;
  dueTo?: string;
  tagIds: string[];          // UUID[]
  tagMode: "and" | "or";
};

function parsePriorities(raw: string | null): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n));
}

export function useBoardFilters(): [
  BoardFilters,
  (patch: Partial<BoardFilters>) => void,
  { reset: () => void; togglePriority: (p: number) => void }
] {
  const [sp, setSp] = useSearchParams();

  const filters = useMemo<BoardFilters>(() => {
    const q = sp.get("q") || "";
    const priorities = parsePriorities(sp.get("prio"));
    const dueFrom = sp.get("df") || undefined;
    const dueTo = sp.get("dt") || undefined;

    const tagsRaw = sp.get("tags") || "";
    const tagIds = tagsRaw
      ? tagsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    const tagMode = (sp.get("tm") as "and" | "or") || "or";

    return { q, priorities, dueFrom, dueTo, tagIds, tagMode };
  }, [sp]);

  const update = useCallback((patch: Partial<BoardFilters>) => {
  const next = new URLSearchParams(sp);

  const q       = patch.q         ?? filters.q;
  const prios   = patch.priorities?? filters.priorities;
  const df      = patch.dueFrom   ?? filters.dueFrom;
  const dt      = patch.dueTo     ?? filters.dueTo;
  const tagIds  = patch.tagIds    ?? filters.tagIds;
  const tagMode = patch.tagMode   ?? filters.tagMode;

  if (q) next.set('q', q); else next.delete('q');
  if (prios.length > 0) next.set('prio', prios.join(',')); else next.delete('prio');
  if (df) next.set('df', df); else next.delete('df');
  if (dt) next.set('dt', dt); else next.delete('dt');
  if (tagIds.length > 0) next.set('tags', tagIds.join(',')); else next.delete('tags');
  if (tagMode !== 'or') next.set('tm', tagMode); else next.delete('tm'); // "or" — дефолт

  const prevStr = sp.toString();
  const nextStr = next.toString();
  if (nextStr !== prevStr) setSp(next, { replace: true });
}, [sp, setSp, filters]);


  const reset = useCallback(() => {
    const next = new URLSearchParams();
    const prevStr = sp.toString();
    const nextStr = next.toString();
    if (nextStr !== prevStr) setSp(next, { replace: true });
  }, [sp, setSp]);

  const togglePriority = useCallback(
  (p: number) => {
    const next = new Set(filters.priorities);
    if (next.has(p)) {
      next.delete(p);
    } else {
      next.add(p);
    }
    update({ priorities: Array.from(next).sort((a, b) => a - b) });
  },
  [filters.priorities, update],
);


  return [filters, update, { reset, togglePriority }];
}
