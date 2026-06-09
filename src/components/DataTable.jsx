import { Search } from 'lucide-react'

export function DataTable({ columns, emptyText, rows, search, onSearch }) {
  return (
    <section className="panel">
      {onSearch ? (
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={17} />
            <input
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Search"
              type="search"
              value={search}
            />
          </div>
        </div>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-state" colSpan={columns.length}>
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
