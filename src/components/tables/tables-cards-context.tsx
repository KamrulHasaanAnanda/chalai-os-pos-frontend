"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  TABLE_DENSITY_KEY,
  TABLE_SORT_KEY,
  type TableDensity,
  type TableSort,
} from "@/lib/table-card-config";

type Ctx = {
  density: TableDensity;
  sort: TableSort;
  setDensity: (d: TableDensity) => void;
  setSort: (s: TableSort) => void;
};

const TablesCardsContext = createContext<Ctx | null>(null);

function readDensity(): TableDensity {
  if (typeof window === "undefined") return "comfortable";
  const v = localStorage.getItem(TABLE_DENSITY_KEY);
  return v === "compact" || v === "large" ? v : "comfortable";
}

function readSort(): TableSort {
  if (typeof window === "undefined") return "busy";
  const v = localStorage.getItem(TABLE_SORT_KEY);
  return v === "label" ? "label" : "busy";
}

export function TablesCardsProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<TableDensity>("comfortable");
  const [sort, setSortState] = useState<TableSort>("busy");

  useEffect(() => {
    setDensityState(readDensity());
    setSortState(readSort());
  }, []);

  const setDensity = useCallback((d: TableDensity) => {
    setDensityState(d);
    localStorage.setItem(TABLE_DENSITY_KEY, d);
  }, []);

  const setSort = useCallback((s: TableSort) => {
    setSortState(s);
    localStorage.setItem(TABLE_SORT_KEY, s);
  }, []);

  return (
    <TablesCardsContext.Provider value={{ density, sort, setDensity, setSort }}>
      {children}
    </TablesCardsContext.Provider>
  );
}

export function useTablesCardsPrefs() {
  const ctx = useContext(TablesCardsContext);
  if (!ctx) throw new Error("useTablesCardsPrefs requires TablesCardsProvider");
  return ctx;
}