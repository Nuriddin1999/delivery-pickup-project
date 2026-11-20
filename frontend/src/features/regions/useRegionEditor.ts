import { useState } from "react";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { CourierView } from "@/api/types";
import { sameRegions, toggleRegion } from "@/domain/regions";
import { useStateMutation } from "@/hooks/useStateMutation";

export interface RegionMessage {
  ok: boolean;
  text: string;
}

/**
 * Editing one courier's regions: a draft the dispatcher changes by clicking
 * the map, saved to the server in one step.
 */
export function useRegionEditor(couriers: CourierView[]) {
  const [courierId, setCourierId] = useState("");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [message, setMessage] = useState<RegionMessage | null>(null);
  const saveMutation = useStateMutation((v: { id: string; regions: string[] }) => dispatchApi.setRegions(v.id, v.regions));

  const courier = couriers.find((c) => c.id === courierId);
  const dirty = !!courier && !!draft && !sameRegions(courier.regions, draft);

  /** Starts editing; regions is passed for a courier not in the list yet. */
  const edit = (id: string, regions?: string[]) => {
    setCourierId(id);
    setMessage(null);
    const c = couriers.find((x) => x.id === id);
    setDraft(regions ?? (c ? [...c.regions] : null));
  };

  /** Switches courier, asking first if changes would be lost. */
  const pick = (id: string): boolean => {
    if (dirty && !confirm(`Drop the unsaved region changes for ${courier!.name}?`)) return false;
    edit(id);
    return true;
  };

  const toggle = (region: string) => {
    if (!draft) return;
    setMessage(null);
    setDraft(toggleRegion(draft, region));
  };

  const reset = () => courier && setDraft([...courier.regions]);

  const save = () => {
    if (!courier || !draft) return;
    saveMutation.mutate(
      { id: courier.id, regions: draft },
      {
        onSuccess: (saved) => {
          setDraft(saved.regions);
          setMessage({ ok: true, text: `Saved: ${saved.name} works in ${saved.regions.join(", ") || "no regions"}` });
        },
        onError: (err) => setMessage({ ok: false, text: errorMessage(err) }),
      },
    );
  };

  return { courierId, courier, draft, dirty, saving: saveMutation.isPending, message, edit, pick, toggle, reset, save };
}

export type RegionEditor = ReturnType<typeof useRegionEditor>;
