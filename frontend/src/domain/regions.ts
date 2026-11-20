/** True when both lists hold the same regions, in any order. */
export function sameRegions(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x) => b.includes(x));
}

/** Adds the region if it is missing, removes it if it is there. */
export function toggleRegion(regions: string[], name: string): string[] {
  return regions.includes(name) ? regions.filter((r) => r !== name) : [...regions, name];
}
