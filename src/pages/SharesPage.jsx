import { Download, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { formatDate, getPageData } from '../utils/format.js'

export function SharesPage({ mode, onError, user }) {
  const [shares, setShares] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadShares() {
    setLoading(true)
    try {
      const response = await api.shares()
      setShares(getPageData(response))
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    api
      .shares()
      .then((response) => {
        if (active) setShares(getPageData(response))
      })
      .catch(onError)
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [onError])

  const filteredShares = useMemo(() => {
    const keyword = search.toLowerCase()
    return shares
      .filter((share) =>
        mode === 'incoming' ? share.receiver_id === user.id : share.sender_id === user.id,
      )
      .filter((share) => share.document?.original_name?.toLowerCase().includes(keyword))
  }, [mode, search, shares, user.id])

  async function revokeShare(id) {
    const confirmed = window.confirm('Cabut akses share ini?')
    if (!confirmed) return

    try {
      await api.deleteShare(id)
      await loadShares()
    } catch (error) {
      onError(error)
    }
  }

  const columns = [
    {
      key: 'document',
      label: 'Document',
      render: (share) => (
        <div className="file-cell">
          <strong>{share.document?.original_name ?? 'Unknown document'}</strong>
          <small>{mode === 'incoming' ? share.sender?.email : share.receiver?.email}</small>
        </div>
      ),
    },
    {
      key: 'permission',
      label: 'Permission',
      render: (share) => (
        <StatusBadge tone={share.permission === 'download' ? 'success' : 'neutral'}>
          {share.permission}
        </StatusBadge>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (share) => <StatusBadge tone="info">{share.status}</StatusBadge>,
    },
    {
      key: 'created_at',
      label: 'Shared',
      render: (share) => formatDate(share.created_at),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (share) => (
        <div className="row-actions">
          {mode === 'incoming' && share.permission === 'download' ? (
            <button
              aria-label="Download shared document"
              className="icon-button"
              onClick={() => api.downloadDocument(share.document).catch(onError)}
              type="button"
            >
              <Download size={16} />
            </button>
          ) : null}
          {mode === 'sent' ? (
            <button
              aria-label="Revoke share"
              className="icon-button danger"
              onClick={() => revokeShare(share.id)}
              type="button"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      ),
    },
  ]

  if (loading) return <div className="panel loading-panel">Loading shares...</div>

  return (
    <DataTable
      columns={columns}
      emptyText={mode === 'incoming' ? 'Belum ada file masuk.' : 'Belum ada file terkirim.'}
      onSearch={setSearch}
      rows={filteredShares}
      search={search}
    />
  )
}
