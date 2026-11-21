import type { CourierView } from "@/api/types";
import { useStoredFlag } from "@/hooks/useStoredFlag";
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
  /** returns false when the dispatcher chose to keep unsaved changes */
  onPick: (courierId: string) => boolean;
}

/**
 * Floating bar on the map: pick a courier, click regions, save. The × folds
 * it into a small "Regions" button (remembered) so it does not cover the
 * map; it opens again by itself when a courier's regions are being edited,
 * e.g. right after adding a courier.
 */
export function RegionEditor({ editor, couriers, allRegions, colors, disabled, onPick }: Props) {
  const { courier, draft, dirty, saving, message } = editor;
  const color = courier ? colors[courier.id] : "";
  const [open, setOpen] = useStoredFlag("dispatch.regionBarOpen", true);

  // Closing also stops editing; with unsaved changes the dispatcher is asked first.
  const close = () => {
    if (editor.courierId && !onPick("")) return;
    setOpen(false);
  };

  if (!open && !editor.courierId)
    return (
      <button
        type="button"
        className="pointer-events-auto cursor-pointer rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-md hover:bg-white"
        onClick={() => setOpen(true)}
        title="Choose a courier's regions on the map"
      >
        Regions
      </button>
    );

  return (
    <div className="pointer-events-auto relative flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/95 py-2 pr-9 pl-3 shadow-md">
      <button
        type="button"
        className="absolute top-1.5 right-1.5 cursor-pointer rounded-md px-1.5 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-default disabled:opacity-40"
        onClick={close}
        disabled={saving}
        title="Hide the regions bar"
        aria-label="Hide the regions bar"
      >
        ×
      </button>
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
          <Button variant="link" disabled={saving} onClick={() => onPick("")} title="Stop editing regions">
            Done
          </Button>
          {dirty && <span className={hintText}>Unsaved: click regions on the map to add or remove them.</span>}
          {!dirty && !message && <span className={hintText}>Click a region on the map to add or remove it.</span>}
        </>
      )}
      {message && <span className={message.ok ? okText : errorText}>{message.text}</span>}
    </div>
  );
}
