// Tailwind class strings shared by many components.

/** Joins class names, skipping empty ones. */
export const cn = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ");

export const inputClass = "min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
export const mutedText = "text-slate-500";
export const hintText = "text-[13px] text-slate-500";
export const errorText = "text-[13px] text-red-600";
export const okText = "text-[13px] text-green-700";
export const listItem = "cursor-pointer border-b border-slate-200 py-1.5 text-[13px] hover:bg-slate-50";
