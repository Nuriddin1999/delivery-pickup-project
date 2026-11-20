import type { Point } from "@/api/types";

interface Props {
  point: Point;
  onShow: () => void;
}

/** The start point's coordinates as a link that shows it on the map. */
export function StartPointLink({ point, onShow }: Props) {
  return (
    <button
      type="button"
      title="Show the start point on the map"
      className="cursor-pointer whitespace-nowrap text-blue-600 tabular-nums hover:underline"
      onClick={(e) => {
        e.stopPropagation();
        onShow();
      }}
    >
      ◎ {point.lat.toFixed(4)}, {point.lng.toFixed(4)}
    </button>
  );
}
