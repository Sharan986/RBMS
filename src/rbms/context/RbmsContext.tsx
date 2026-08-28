import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchDistricts } from "../api";
import { DEMO, subscribeToStore } from "../data/store";
import type { District } from "../types";

interface RbmsContextValue {
  districtId: string;
  districtName: string;
  districts: District[];
  setDistrictId: (id: string) => void;
  /** The signed-in District Manager (mocked) — used as the verifier identity. */
  currentUser: { id: string; name: string; email: string };
  workspace: string;
}

const Ctx = createContext<RbmsContextValue | null>(null);
const STORAGE_KEY = "rbms.districtId";

export function RbmsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [districtId, setDistrictIdState] = useState(DEMO.districtId);

  // Read the persisted district after hydration to avoid an SSR mismatch.
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) setDistrictIdState(stored);
  }, []);

  // Any mutation to the shared mock store refreshes every dependent view.
  useEffect(() => subscribeToStore(() => void queryClient.invalidateQueries()), [queryClient]);

  const { data: districts = [] } = useQuery({ queryKey: ["districts"], queryFn: fetchDistricts });

  const value = useMemo<RbmsContextValue>(
    () => ({
      districtId,
      districtName: districts.find((d) => d.id === districtId)?.name ?? "Jamshedpur",
      districts,
      setDistrictId: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setDistrictIdState(id);
      },
      currentUser: { id: DEMO.agentId, name: "Gokul Yadav", email: "gokul.yadav@digikrishi.com" },
      workspace: "Maize – Agriculture",
    }),
    [districtId, districts],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRbms() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRbms must be used inside RbmsProvider");
  return ctx;
}
