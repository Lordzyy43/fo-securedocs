import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { formatDate, getPageData } from '../utils/format.js'

export function AuditLogsPage({ onError }) {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .auditLogs()
      .then((response) => setLogs(getPageData(response)))
      .catch(onError)
      .finally(() => setLoading(false))
  }, [onError])

  const filteredLogs = useMemo(() => {
    const keyword = search.toLowerCase()
    return logs.filter((log) => {
      const haystack = `${log.activity} ${log.description} ${log.user?.email ?? ''}`
      return haystack.toLowerCase().includes(keyword)
    })
  }, [logs, search])

  const columns = [
    {
      key: 'activity',
      label: 'Activity',
      render: (log) => <strong>{log.activity}</strong>,
    },
    {
      key: 'user',
      label: 'User',
      render: (log) => log.user?.email ?? 'System',
    },
    {
      key: 'description',
      label: 'Description',
    },
    {
      key: 'status',
      label: 'Status',
      render: (log) => (
        <StatusBadge tone={log.status === 'failure' ? 'danger' : 'success'}>
          {log.status}
        </StatusBadge>
      ),
    },
    {
      key: 'ip_address',
      label: 'IP',
      render: (log) => log.ip_address ?? '-',
    },
    {
      key: 'created_at',
      label: 'Time',
      render: (log) => formatDate(log.created_at),
    },
  ]

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        Loading audit logs...
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      emptyText="Belum ada audit log."
      onSearch={setSearch}
      rows={filteredLogs}
      search={search}
    />
  )
}
