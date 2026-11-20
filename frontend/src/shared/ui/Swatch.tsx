/** A small square in a courier's colour. */
export function Swatch({ color }: { color: string }) {
  return <span className="inline-block size-3 rounded-[3px]" style={{ background: color }} />;
}
