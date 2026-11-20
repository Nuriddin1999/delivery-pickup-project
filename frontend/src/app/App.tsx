import { useDispatchState } from "@/hooks/useDispatchState";
import { Dashboard } from "./Dashboard";
import { LoadingScreen } from "./LoadingScreen";

/** Loads the data, then shows the dispatcher's dashboard. */
export default function App() {
  const { state, shapes, loadError, refresh } = useDispatchState();

  if (!state) return <LoadingScreen error={loadError} onRetry={refresh} />;
  return <Dashboard state={state} shapes={shapes} loadError={loadError} refresh={refresh} />;
}
