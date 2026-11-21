import { useSearchParams } from "react-router-dom";
import { defaultShow, isOrderFilter, type OrderQuery } from "./orderFilter";

/**
 * The order list's filter, region and search, read from and written to the
 * address (?show=free&region=Chilonzor&q=o1), so a reload or a shared link
 * keeps them.
 */
function toParams(q: OrderQuery): URLSearchParams {
  const out = new URLSearchParams();
  if (q.show !== defaultShow) out.set("show", q.show);
  if (q.region) out.set("region", q.region);
  if (q.q) out.set("q", q.q);
  return out;
}

export function useOrderQuery() {
  const [params, setParams] = useSearchParams();
  const show = params.get("show");
  const query: OrderQuery = {
    show: isOrderFilter(show) ? show : defaultShow,
    region: params.get("region") ?? "",
    q: params.get("q") ?? "",
  };

  const set = (patch: Partial<OrderQuery>) => setParams(toParams({ ...query, ...patch }), { replace: true });

  /** the query string for this query with some parts changed, e.g. "?show=taken&region=Chilonzor" */
  const searchWith = (patch: Partial<OrderQuery>) => {
    const s = toParams({ ...query, ...patch }).toString();
    return s ? `?${s}` : "";
  };

  return { query, set, searchWith };
}
