import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { formatDate, getPageData } from '../utils/format.js'

export function AuditLogsPage({ onError }) {
  const [logs, setLogs] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const activityLabels = {
    failed_login: 'Login gagal',
    login: 'Login berhasil',
    logout: 'Logout',
    password_change: 'Ganti password',
    pin_setup: 'Buat PIN',
    pin_verified: 'Verifikasi PIN',
    failed_pin: 'PIN salah',
    pin_change: 'Ganti PIN',
    user_management: 'Manajemen user',
    inactive_session_blocked: 'Session inactive diblokir',
  }

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
      return (
        (statusFilter === 'all' || log.status === statusFilter) &&
        haystack.toLowerCase().includes(keyword)
      )
    })
  }, [logs, search, statusFilter])

  const successCount = logs.filter((log) => log.status === 'success').length
  const failureCount = logs.filter((log) => log.status === 'failure').length

  const columns = [
    {
      key: 'activity',
      label: 'Activity',
      render: (log) => (
        <div className="grid gap-1">
          <strong className="text-slate-950">
            {activityLabels[log.activity] ?? log.activity}
          </strong>
          <span className="font-mono text-[10px] uppercase tracking-wide text-slate-400">
            {log.activity}
          </span>
        </div>
      ),
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
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-tealbrand">
            Security Trail
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            Audit Log Aktivitas Sensitif
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Login, PIN, reset admin, share dokumen, dan aktivitas penting tercatat di sini.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-lg font-black text-slate-950">{logs.length}</p>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-lg font-black text-emerald-700">{successCount}</p>
            <p className="text-[10px] font-bold uppercase text-emerald-600">Sukses</p>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
            <p className="text-lg font-black text-rose-700">{failureCount}</p>
            <p className="text-[10px] font-bold uppercase text-rose-600">Gagal</p>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <label className="grid max-w-sm gap-2 text-sm font-semibold text-slate-700">
          <span>Filter Status Audit</span>
          <select
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">Semua status</option>
            <option value="success">Sukses</option>
            <option value="failure">Gagal</option>
          </select>
        </label>
      </section>

      <DataTable
        columns={columns}
        emptyText="Belum ada audit log."
        onSearch={setSearch}
        rows={filteredLogs}
        search={search}
      />
    </div>
  )
}
