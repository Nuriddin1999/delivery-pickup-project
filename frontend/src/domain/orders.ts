import type { Order } from "@/api/types";

export function isBroken(o: Order): boolean {
  return (o.problems?.length ?? 0) > 0;
}
