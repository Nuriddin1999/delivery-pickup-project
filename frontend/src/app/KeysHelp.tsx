const keys: [string, string][] = [
  ["↓ ↑ or J K", "next / previous order in the list"],
  ["1 – 9", "give the open order to that courier"],
  ["U", "undo the last change"],
  ["Esc", "close the open order"],
  ["/", "find an order by id"],
];

/** A "Keys" button that lists the keyboard shortcuts. */
export function KeysHelp() {
  return (
    <details className="relative text-[13px]">
      <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-2 py-1 text-slate-600 select-none hover:bg-slate-50">Keys</summary>
      <div className="absolute right-0 z-3000 mt-1 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
        <p className="mb-1.5 font-semibold">Keyboard shortcuts</p>
        <table className="w-full">
          <tbody>
            {keys.map(([k, what]) => (
              <tr key={k}>
                <td className="py-0.5 pr-3 whitespace-nowrap">
                  <kbd className="rounded border border-slate-300 bg-slate-50 px-1 text-xs">{k}</kbd>
                </td>
                <td className="py-0.5 text-slate-600">{what}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-1.5 text-xs text-slate-500">Keys do nothing while you type in a field.</p>
      </div>
    </details>
  );
}
