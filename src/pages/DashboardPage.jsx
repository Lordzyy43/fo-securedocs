import { FileCheck2, FileText, Inbox, ScrollText, Send, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { StatCard } from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import { getPageData, formatDate } from '../utils/format.js'

export function DashboardPage({ isAdmin, onError, onNavigate, user }) {
  const [documents, setDocuments] = useState([])
  const [shares, setShares] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const requests = [api.documents(), api.shares()]
    if (isAdmin) requests.push(api.auditLogs())

    Promise.all(requests)
      .then(([documentResponse, shareResponse, logResponse]) => {
        setDocuments(getPageData(documentResponse))
        setShares(getPageData(shareResponse))
        setLogs(getPageData(logResponse))
      })
      .catch(onError)
      .finally(() => setLoading(false))
  }, [isAdmin, onError])

  const stats = useMemo(
    () => ({
      encrypted: documents.filter((document) => document.encrypted).length,
      incoming: isAdmin ? shares.length : shares.filter((share) => share.receiver_id === user.id).length,
      sent: isAdmin ? shares.length : shares.filter((share) => share.sender_id === user.id).length,
    }),
    [documents, isAdmin, shares, user.id],
  )

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        Loading dashboard...
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 xl:grid-cols-4">
        <StatCard icon={FileText} label="Total Documents" value={documents.length} />
        <StatCard icon={FileCheck2} label="Encrypted" tone="green" value={stats.encrypted} />
        <StatCard icon={Inbox} label="Incoming Files" tone="amber" value={stats.incoming} />
        <StatCard icon={Send} label="Sent Files" tone="purple" value={stats.sent} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <button
          className="rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:border-cyan-300 hover:ring-1 hover:ring-cyan-100"
          onClick={() => onNavigate('documents')}
          type="button"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
            <Upload size={22} />
          </div>
          <strong className="block text-lg">Upload Document</strong>
          <p className="mt-2 text-sm text-slate-500">Validasi file dan simpan terenkripsi.</p>
        </button>

        <button
          className="rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:border-slate-300"
          onClick={() => onNavigate('documents')}
          type="button"
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <FileText size={22} />
          </div>
          <strong className="block text-lg">Manage Documents</strong>
          <p className="mt-2 text-sm text-slate-500">Lihat metadata, download, delete, dan share.</p>
        </button>

        {isAdmin ? (
          <button
            className="rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:border-slate-300"
            onClick={() => onNavigate('audit')}
            type="button"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <ScrollText size={22} />
            </div>
            <strong className="block text-lg">Audit Logs</strong>
            <p className="mt-2 text-sm text-slate-500">Monitor login, upload, download, delete, dan share.</p>
          </button>
        ) : null}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-600">Recent activity</p>
            <h2 className="text-2xl font-semibold text-slate-950">
              {isAdmin ? 'System audit snapshot' : 'Document snapshot'}
            </h2>
          </div>
        </div>

        <div className="grid gap-3">
          {(isAdmin ? logs : documents).slice(0, 5).map((item) => (
            <div
              className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={item.id}
            >
              <div>
                <p className="font-semibold text-slate-950">{isAdmin ? item.activity : item.original_name}</p>
                <p className="text-sm text-slate-500">{isAdmin ? item.user?.email ?? 'System' : item.mime_type}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                {isAdmin ? item.status : formatDate(item.created_at)}
              </span>
            </div>
          ))}

          {(isAdmin ? logs : documents).length === 0 ? (
            <p className="text-center text-sm text-slate-500">Belum ada aktivitas yang bisa ditampilkan.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
