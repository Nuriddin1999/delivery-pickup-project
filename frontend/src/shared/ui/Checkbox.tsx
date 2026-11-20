import type { ReactNode } from "react";

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}

/** A checkbox with its label. */
export function Checkbox({ checked, onChange, children }: Props) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}
