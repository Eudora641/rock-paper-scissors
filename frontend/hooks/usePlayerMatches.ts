"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type MatchStatus =
  | "waitingOpponent"
  | "awaitingResolution"
  | "resolved"
  | "cancelled"
  | "unknown";

export type PlayerMatch = {
  matchId: string;
  role: "creator" | "challenger";
  opponent: string;
  status: MatchStatus;
  lastUpdated: number;
  note?: string;
};

function loadMatches(key: string) {
  if (typeof window === "undefined") {
    return [] as PlayerMatch[];
  }
  try {
    const saved = window.localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return parsed as PlayerMatch[];
  } catch {
    return [];
  }
}

function saveMatches(key: string, matches: PlayerMatch[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(matches));
  } catch {
    // ignore write errors (quota, private mode, etc)
  }
}

export function usePlayerMatches(address: string | undefined) {
  const storageKey = useMemo(
    () => (address ? `cloak-and-clash:mymatches:${address.toLowerCase()}` : undefined),
    [address],
  );
  const [matches, setMatches] = useState<PlayerMatch[]>([]);

  useEffect(() => {
    if (!storageKey) {
      setMatches([]);
      return;
    }
    setMatches(loadMatches(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (updater: (current: PlayerMatch[]) => PlayerMatch[]) => {
      setMatches((prev) => {
        const next = updater(prev);
        if (storageKey) {
          saveMatches(storageKey, next);
        }
        return next;
      });
    },
    [storageKey],
  );

  const upsertMatch = useCallback(
    (entry: PlayerMatch) => {
      if (!entry.matchId) return;
      persist((prev) => {
        const idx = prev.findIndex((item) => item.matchId === entry.matchId);
        if (idx === -1) {
          return [entry, ...prev].slice(0, 50);
        }
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...entry, lastUpdated: entry.lastUpdated };
        return updated;
      });
    },
    [persist],
  );

  const updateMatch = useCallback(
    (matchId: string, changes: Partial<PlayerMatch>) => {
      if (!matchId) return;
      persist((prev) => {
        const idx = prev.findIndex((item) => item.matchId === matchId);
        if (idx === -1) return prev;
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          ...changes,
          lastUpdated: changes.lastUpdated ?? Date.now(),
        };
        return next;
      });
    },
    [persist],
  );

  const clearMatches = useCallback(() => {
    if (!storageKey) return;
    persist(() => []);
  }, [persist, storageKey]);

  return {
    matches,
    upsertMatch,
    updateMatch,
    clearMatches,
  };
}

