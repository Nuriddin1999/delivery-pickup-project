import { useState } from "react";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { CourierView } from "@/api/types";
import { sameRegions, toggleRegion } from "@/domain/regions";

export interface RegionMessage {
  ok: boolean;
  text: string;
}

/**
 * Editing one courier's regions: a draft the dispatcher changes by clicking
 * the map, saved to the server in one step.
 */
export function useRegionEditor(couriers: CourierView[], refresh: () => Promise<void>) {
  const [courierId, setCourierId] = useState("");
  const [draft, setDraft] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<RegionMessage | null>(null);

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

  const save = async () => {
    if (!courier || !draft) return;
    setSaving(true);
    try {
      const saved = await dispatchApi.setRegions(courier.id, draft);
      setDraft(saved.regions);
      setMessage({ ok: true, text: `Saved: ${saved.name} works in ${saved.regions.join(", ") || "no regions"}` });
      await refresh();
    } catch (err) {
      setMessage({ ok: false, text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return { courierId, courier, draft, dirty, saving, message, edit, pick, toggle, reset, save };
}

export type RegionEditor = ReturnType<typeof useRegionEditor>;
