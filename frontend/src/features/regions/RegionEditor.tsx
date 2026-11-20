import type { CourierView } from "@/api/types";
import type { RegionEditor as Editor } from "./useRegionEditor";
import { Button } from "@/shared/ui/Button";
import { Swatch } from "@/shared/ui/Swatch";
import { errorText, hintText, inputClass, okText } from "@/shared/ui/styles";
import { RegionChip } from "./RegionChip";

interface Props {
  editor: Editor;
  couriers: CourierView[];
  allRegions: string[];
  colors: Record<string, string>;
  /** the map is busy with something else (the add-courier form) */
  disabled: boolean;
  onPick: (courierId: string) => void;
}

/** Toolbar above the map: pick a courier, click regions, save. */
export function RegionEditor({ editor, couriers, allRegions, colors, disabled, onPick }: Props) {
  const { courier, draft, dirty, saving, message } = editor;
  const color = courier ? colors[courier.id] : "";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <label>
        Regions of{" "}
        <select className={inputClass} value={editor.courierId} disabled={disabled} onChange={(e) => onPick(e.target.value)}>
          <option value="">— choose a courier —</option>
          {couriers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </label>

      {disabled && <span className={hintText}>Close the “Add courier” form to edit regions.</span>}

      {courier && draft && !disabled && (
        <>
          <Swatch color={color} />
          <div className="flex flex-wrap gap-1">
            {allRegions.map((r) => (
              <RegionChip key={r} name={r} on={draft.includes(r)} color={color} onToggle={() => editor.toggle(r)} />
            ))}
          </div>
          <Button variant="primary" disabled={!dirty || saving} onClick={editor.save}>
            {saving ? "Saving…" : "Save regions"}
          </Button>
          <Button disabled={!dirty || saving} onClick={editor.reset}>
            Undo changes
          </Button>
          {dirty && <span className={hintText}>Unsaved: click regions on the map to add or remove them.</span>}
          {!dirty && !message && <span className={hintText}>Click a region on the map to add or remove it.</span>}
        </>
      )}
      {message && <span className={message.ok ? okText : errorText}>{message.text}</span>}
    </div>
  );
}
