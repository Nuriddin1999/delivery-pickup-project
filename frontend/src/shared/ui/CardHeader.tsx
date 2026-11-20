import type { ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  title: ReactNode;
  /** shows a "close" link on the right */
  onClose?: () => void;
  /** anything else for the right side */
  aside?: ReactNode;
}

export function CardHeader({ title, onClose, aside }: Props) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="m-0 flex items-center gap-1.5 text-[15px] font-semibold">{title}</h3>
      {aside}
      {onClose && (
        <Button variant="link" onClick={onClose}>
          close
        </Button>
      )}
    </div>
  );
}
