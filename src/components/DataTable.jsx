export function DataTable({ columns, emptyText, rows, search, onSearch }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
      {onSearch ? (
        <div className="mb-4 flex justify-end">
          <div className="relative w-full max-w-xs">
            <input
              className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search..."
              type="search"
              value={search}
            />
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 sm:px-5">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200 last:border-b">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-4 align-top sm:px-5">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500 sm:px-5" colSpan={columns.length}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
