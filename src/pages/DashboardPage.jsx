import { FileCheck2, FileText, Inbox, ScrollText, Send, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { StatCard } from '../components/StatCard.jsx'
import { api } from '../services/api.js'
import { getPageData } from '../utils/format.js'

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

  if (loading) return <div className="panel loading-panel">Loading dashboard...</div>

  return (
    <div className="page-stack">
      <section className="stats-grid">
        <StatCard icon={FileText} label="Total Documents" value={documents.length} />
        <StatCard icon={FileCheck2} label="Encrypted" tone="green" value={stats.encrypted} />
        <StatCard icon={Inbox} label="Incoming Files" tone="amber" value={stats.incoming} />
        <StatCard icon={Send} label="Sent Files" tone="purple" value={stats.sent} />
      </section>

      <section className="action-grid">
        <button className="action-tile" onClick={() => onNavigate('upload')} type="button">
          <Upload size={22} />
          <strong>Upload Document</strong>
          <span>Validasi file dan simpan terenkripsi.</span>
        </button>
        <button className="action-tile" onClick={() => onNavigate('documents')} type="button">
          <FileText size={22} />
          <strong>Manage Documents</strong>
          <span>Lihat metadata, download, delete, dan share.</span>
        </button>
        {isAdmin ? (
          <button className="action-tile" onClick={() => onNavigate('audit')} type="button">
            <ScrollText size={22} />
            <strong>Audit Logs</strong>
            <span>Monitor login, upload, download, delete, dan share.</span>
          </button>
        ) : null}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Recent activity</p>
            <h2>{isAdmin ? 'System audit snapshot' : 'Document snapshot'}</h2>
          </div>
        </div>
        <div className="activity-list">
          {(isAdmin ? logs : documents).slice(0, 5).map((item) => (
            <div className="activity-item" key={item.id}>
              <span>{isAdmin ? item.activity : item.original_name}</span>
              <small>{isAdmin ? item.user?.email ?? 'System' : item.mime_type}</small>
            </div>
          ))}
          {(isAdmin ? logs : documents).length === 0 ? (
            <p className="muted">Belum ada aktivitas yang bisa ditampilkan.</p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
