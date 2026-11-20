import type { Route } from "@/api/types";
import { formatKm } from "@/domain/format";
import { mutedText } from "@/shared/ui/styles";

interface Props {
  shown: Route;
  given: Route;
  shorter: Route;
}

/** Total km, with the given and the shorter order side by side. */
export function RouteTotal({ shown, given, shorter }: Props) {
  const saved = given.total_km - shorter.total_km;
  return (
    <p className="mt-1">
      Total: <b>{formatKm(shown.total_km)}</b>
      {given.stops.length > 0 && (
        <span className={mutedText}>
          {" "}
          · given order {formatKm(given.total_km)}, shorter order {formatKm(shorter.total_km)}
          {saved > 0.004 ? ` (saves ${formatKm(saved)})` : " (already best)"}
        </span>
      )}
    </p>
  );
}
