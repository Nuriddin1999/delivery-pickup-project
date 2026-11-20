// Tailwind class strings used by several components, so a button or a card
// looks the same everywhere.

/** Joins class names, skipping empty ones. */
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

const btnBase = "cursor-pointer rounded-md border px-3 py-1.5 disabled:cursor-default disabled:opacity-50";
export const btn = `${btnBase} border-slate-300 bg-white hover:bg-slate-50`;
export const btnPrimary = `${btnBase} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`;
export const btnLink = "cursor-pointer text-blue-600 hover:underline";

export const input = "min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5";
export const card = "rounded-lg border border-slate-200 bg-white px-3 py-2.5";
export const cardTitle = "m-0 flex items-center gap-1.5 text-[15px] font-semibold";

export const muted = "text-slate-500";
export const hint = "text-[13px] text-slate-500";
export const errorText = "text-[13px] text-red-600";
export const okText = "text-[13px] text-green-700";
export const errorBox = "rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-red-800";
export const warnBox = "rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[13px] text-amber-800";
export const noteBox = "rounded-md bg-blue-50 px-2 py-1 text-[13px] text-blue-800";

const tag = "ml-1 rounded-full px-1.5 py-px text-[11px] font-medium";
export const tagPlain = `${tag} bg-slate-200 text-slate-700`;
export const tagBad = `${tag} bg-red-100 text-red-600`;
export const tagWarn = `${tag} bg-amber-100 text-amber-800`;

export const swatch = "inline-block size-3 rounded-[3px]";
export const checkLabel = "inline-flex items-center gap-1.5";
