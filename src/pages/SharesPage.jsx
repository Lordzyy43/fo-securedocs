import { Download, Trash2, Eye, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { inferPreviewMimeType, isPreviewableMimeType } from '../utils/filePreview.js'
import { formatDate, getPageData } from '../utils/format.js'

export function SharesPage({ mode, onError, user }) {
  const [shares, setShares] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  // Preview States
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedShare, setSelectedShare] = useState(null)

  const normalizeSharedDocument = useCallback((document) => {
    const share = document.shares?.[0] ?? {}

    return {
      ...share,
      id: share.id ?? document.id,
      document,
      document_id: document.id,
      sender: share.sender ?? document.owner,
      sender_id: share.sender_id ?? document.owner_id,
      receiver_id: share.receiver_id ?? user.id,
      permission: share.permission,
      status: share.status,
      created_at: share.created_at ?? document.created_at,
    }
  }, [user.id])

  const fetchShares = useCallback(async () => {
    const response = mode === 'incoming' ? await api.sharedWithMeDocuments() : await api.shares()
    const data = getPageData(response)

    return mode === 'incoming' ? data.map(normalizeSharedDocument) : data
  }, [mode, normalizeSharedDocument])

  async function loadShares() {
    setLoading(true)
    try {
      setShares(await fetchShares())
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchShares()
      .then((data) => {
        if (active) setShares(data)
      })
      .catch(onError)
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fetchShares, onError])

  const filteredShares = useMemo(() => {
    const keyword = search.toLowerCase()
    return shares
      .filter((share) => (mode === 'incoming' ? true : share.sender_id === user.id))
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

  function handlePreview(doc) {
    setPreviewLoading(true)
    try {
      const mimeType = inferPreviewMimeType(doc)
      setPreviewUrl(api.previewDocumentUrl(doc))
      setPreviewFile({ ...doc, mime_type: mimeType })
    } catch (error) {
      onError(error)
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPreviewFile(null)
  }

  function closeShareDetail() {
    setSelectedShare(null)
  }

  function previewSelectedShare() {
    if (!selectedShare?.document) return

    const document = selectedShare.document
    closeShareDetail()
    handlePreview(document)
  }

  const columns = [
    {
      key: 'document',
      label: 'Document',
      render: (share) => (
        <div className="grid gap-1">
          <strong className="text-slate-950">{share.document?.original_name ?? 'Unknown document'}</strong>
          <span className="text-sm text-slate-500">
            {mode === 'incoming' ? share.sender?.email : share.receiver?.email}
          </span>
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
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'incoming' ? (
            <>
              {/* Preview is always available for incoming shares */}
              <button
                aria-label="Preview document"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => setSelectedShare(share)}
                type="button"
              >
                <Eye size={16} />
              </button>
              
              {/* Download button is only available if permission is download */}
              {share.permission === 'download' ? (
                <button
                  aria-label="Download shared document"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  onClick={() => api.downloadDocument(share.document).catch(onError)}
                  type="button"
                >
                  <Download size={16} />
                </button>
              ) : null}
            </>
          ) : null}
          {mode === 'sent' ? (
            <button
              aria-label="Revoke share"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-sm transition hover:bg-rose-100"
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

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        Loading shares...
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {previewLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs">
          <div className="text-white font-semibold">Decrypting and loading document...</div>
        </div>
      )}

      <DataTable
        columns={columns}
        emptyText={mode === 'incoming' ? 'Belum ada file masuk.' : 'Belum ada file terkirim.'}
        onSearch={setSearch}
        rows={filteredShares}
        search={search}
      />

      {mode === 'incoming' && selectedShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Incoming share</p>
                <h3 className="text-lg font-bold text-slate-950">Share Document Detail</h3>
              </div>
              <button
                aria-label="Close share detail"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={closeShareDetail}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-3 text-sm">
              <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Nama dokumen</span>
                <strong className="text-slate-950">{selectedShare.document?.original_name ?? 'Unknown document'}</strong>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Shared by</span>
                  <span className="font-semibold text-slate-800">{selectedShare.sender?.email ?? '-'}</span>
                </div>
                <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Permission</span>
                  <span>
                    <StatusBadge tone={selectedShare.permission === 'download' ? 'success' : 'neutral'}>
                      {selectedShare.permission ?? '-'}
                    </StatusBadge>
                  </span>
                </div>
                <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</span>
                  <span>
                    <StatusBadge tone="info">{selectedShare.status ?? '-'}</StatusBadge>
                  </span>
                </div>
                <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Shared date</span>
                  <span className="font-semibold text-slate-800">{formatDate(selectedShare.created_at)}</span>
                </div>
              </div>
              <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Message</span>
                <p className="whitespace-pre-wrap text-slate-700">{selectedShare.message?.trim() || '-'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={closeShareDetail}
                type="button"
              >
                Close
              </button>
              {selectedShare.permission === 'download' ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => api.downloadDocument(selectedShare.document).catch(onError)}
                  type="button"
                >
                  <Download size={16} />
                  Download
                </button>
              ) : null}
              <button
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={previewSelectedShare}
                type="button"
              >
                <Eye size={16} />
                Preview File
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* PREVIEW MODAL */}
      {previewFile && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Secure Share Preview</p>
                <h3 className="text-lg font-bold text-slate-950">{previewFile.original_name}</h3>
              </div>
              <button
                onClick={closePreview}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-2xl p-4 flex items-center justify-center min-h-[50vh]">
              {previewFile.mime_type?.startsWith('image/') ? (
                <img
                  src={previewUrl}
                  alt={previewFile.original_name}
                  className="max-h-[60vh] object-contain rounded-xl shadow-md"
                />
              ) : isPreviewableMimeType(previewFile.mime_type) ? (
                <iframe
                  src={previewUrl}
                  title={previewFile.original_name}
                  className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center p-8 max-w-md">
                  <p className="text-sm font-bold text-slate-700 mb-2">Pratinjau Tidak Didukung</p>
                  <p className="text-xs text-slate-500">
                    Format file ({previewFile.mime_type}) tidak mendukung rendering langsung di browser. Silakan unduh dokumen (jika diizinkan) untuk membacanya.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
