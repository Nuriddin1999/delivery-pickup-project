import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/api/client";
import { dispatchApi } from "@/api/dispatchApi";
import type { DispatchState } from "@/api/types";

/** Loads the dispatch state and region shapes; refresh() reloads the state. */
export function useDispatchState() {
  const [state, setState] = useState<DispatchState | null>(null);
  const [shapes, setShapes] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setState(await dispatchApi.state());
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    refresh();
    dispatchApi
      .regionShapes()
      .then(setShapes)
      .catch(() => setLoadError("Could not load region shapes"));
  }, [refresh]);

  return { state, shapes, loadError, refresh };
}
