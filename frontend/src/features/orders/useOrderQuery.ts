import { useSearchParams } from "react-router-dom";
import { defaultShow, isOrderFilter, type OrderQuery } from "./orderFilter";

/**
 * The order list's filter, region and search, read from and written to the
 * address (?show=free&region=Chilonzor&q=o1), so a reload or a shared link
 * keeps them.
 */
export function useOrderQuery() {
  const [params, setParams] = useSearchParams();
  const show = params.get("show");
  const query: OrderQuery = {
    show: isOrderFilter(show) ? show : defaultShow,
    region: params.get("region") ?? "",
    q: params.get("q") ?? "",
  };

  const set = (patch: Partial<OrderQuery>) => {
    const next = { ...query, ...patch };
    const out = new URLSearchParams();
    if (next.show !== defaultShow) out.set("show", next.show);
    if (next.region) out.set("region", next.region);
    if (next.q) out.set("q", next.q);
    setParams(out, { replace: true });
  };

  return { query, set };
}
