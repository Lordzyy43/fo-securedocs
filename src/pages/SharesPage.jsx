import { Download, Trash2, Eye, X, PencilLine } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { createPreviewBlob, inferPreviewMimeType, isPreviewableMimeType } from '../utils/filePreview.js'
import { formatDate, getPageData } from '../utils/format.js'

function sortSharesBySharedDate(shares) {
  return [...shares].sort((firstShare, secondShare) => {
    const firstDate = new Date(firstShare.shared_at ?? firstShare.created_at ?? 0).getTime()
    const secondDate = new Date(secondShare.shared_at ?? secondShare.created_at ?? 0).getTime()

    return secondDate - firstDate
  })
}

export function SharesPage({ mode, onError, onSharesChanged, onSuccess, refreshToken, user }) {
  const [shares, setShares] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [shareToRevoke, setShareToRevoke] = useState(null)
  const [revoking, setRevoking] = useState(false)
  const [shareToEdit, setShareToEdit] = useState(null)
  const [editShareForm, setEditShareForm] = useState({ permission: 'view', message: '' })
  const [savingPermission, setSavingPermission] = useState(false)
  const fetchInFlightRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const mountedRef = useRef(false)

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

  const isOversight = mode === 'share-oversight'
  const isIncoming = mode === 'incoming'
  const isSent = mode === 'sent'

  const fetchShares = useCallback(async () => {
    const response = isIncoming ? await api.sharedWithMeDocuments() : await api.shares()
    const data = getPageData(response)

    return isIncoming ? sortSharesBySharedDate(data.map(normalizeSharedDocument)) : data
  }, [isIncoming, normalizeSharedDocument])

  const loadShares = useCallback(async ({ showLoading = false } = {}) => {
    if (fetchInFlightRef.current) return

    fetchInFlightRef.current = true
    if (showLoading) setLoading(true)

    try {
      const data = await fetchShares()
      if (mountedRef.current) setShares(data)
    } catch (error) {
      if (mountedRef.current) onError(error)
    } finally {
      fetchInFlightRef.current = false
      hasLoadedRef.current = true
      if (mountedRef.current && showLoading) setLoading(false)
    }
  }, [fetchShares, onError])

  useEffect(() => {
    mountedRef.current = true
    loadShares({ showLoading: !hasLoadedRef.current })

    return () => {
      mountedRef.current = false
    }
  }, [loadShares, refreshToken])

  const filteredShares = useMemo(() => {
    const keyword = search.toLowerCase()
    return shares
      .filter((share) => {
        if (isOversight || isIncoming) return true
        return share.sender_id === user.id
      })
      .filter((share) => {
        const haystack = [
          share.document?.original_name,
          share.sender?.name,
          share.sender?.email,
          share.receiver?.name,
          share.receiver?.email,
          share.permission,
          share.status,
        ].filter(Boolean).join(' ')

        return haystack.toLowerCase().includes(keyword)
      })
  }, [isIncoming, isOversight, search, shares, user.id])

  const oversightStats = useMemo(() => ({
    total: shares.length,
    sent: shares.filter((share) => share.status === 'sent').length,
    read: shares.filter((share) => share.status === 'read').length,
    downloaded: shares.filter((share) => share.status === 'downloaded').length,
  }), [shares])

  async function revokeShare() {
    if (!shareToRevoke) return

    setRevoking(true)
    try {
      await api.deleteShare(shareToRevoke.id)
      setShareToRevoke(null)
      await loadShares()
      onSharesChanged()
      onSuccess('Akses dokumen berhasil dicabut.')
    } catch (error) {
      onError(error)
    } finally {
      setRevoking(false)
    }
  }

  function openEditShare(share) {
    setShareToEdit(share)
    setEditShareForm({
      permission: share.permission ?? 'view',
      message: share.message ?? '',
    })
  }

  async function updateSharePermission(event) {
    event.preventDefault()
    if (!shareToEdit) return

    setSavingPermission(true)
    try {
      await api.updateShare(shareToEdit.id, editShareForm)
      setShareToEdit(null)
      await loadShares()
      onSharesChanged()
      onSuccess('Permission share berhasil diperbarui.')
    } catch (error) {
      onError(error)
    } finally {
      setSavingPermission(false)
    }
  }

  async function handlePreview(doc) {
    setPreviewLoading(true)
    try {
      const mimeType = inferPreviewMimeType(doc)
      const previewUrl = mimeType === 'application/pdf'
        ? URL.createObjectURL(createPreviewBlob(await api.previewDocument(doc), mimeType))
        : api.previewDocumentUrl(doc)

      setPreviewUrl(previewUrl)
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

  async function previewSelectedShare() {
    if (!selectedShare?.document) return

    const document = selectedShare.document
    closeShareDetail()
    await handlePreview(document)
    onSharesChanged()
  }

  const columns = [
    {
      key: 'document',
      label: 'Document',
      render: (share) => (
        <div className="grid gap-1">
          <strong className="text-slate-950">{share.document?.original_name ?? 'Unknown document'}</strong>
          <span className="text-sm text-slate-500">
            {isIncoming ? share.sender?.email : share.receiver?.email}
          </span>
        </div>
      ),
    },
    ...(isOversight
      ? [
          {
            key: 'sender',
            label: 'Sender',
            render: (share) => (
              <div className="grid gap-1">
                <strong className="text-slate-800">{share.sender?.name ?? '-'}</strong>
                <span className="text-xs text-slate-500">{share.sender?.email ?? '-'}</span>
              </div>
            ),
          },
          {
            key: 'receiver',
            label: 'Receiver',
            render: (share) => (
              <div className="grid gap-1">
                <strong className="text-slate-800">{share.receiver?.name ?? '-'}</strong>
                <span className="text-xs text-slate-500">{share.receiver?.email ?? '-'}</span>
              </div>
            ),
          },
        ]
      : []),
    {
      key: 'permission',
      label: 'Permission',
      render: (share) => (
        <StatusBadge tone={share.permission === 'download' ? 'success' : 'neutral'}>
          {share.permission}
        </StatusBadge>
      ),
    },
    ...(isSent || isOversight
      ? [
          {
            key: 'status',
            label: 'Status',
            render: (share) => <StatusBadge tone="info">{share.status}</StatusBadge>,
          },
        ]
      : []),
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
          {isIncoming ? (
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
          {isSent ? (
            <>
              <button
                aria-label="Edit share permission"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                onClick={() => openEditShare(share)}
                type="button"
              >
                <PencilLine size={16} />
              </button>
              <button
                aria-label="Revoke share"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-sm transition hover:bg-rose-100"
                onClick={() => setShareToRevoke(share)}
                type="button"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : null}
          {isOversight ? (
            <button
              aria-label="View share details"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={() => setSelectedShare(share)}
              type="button"
            >
              <Eye size={16} />
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

      {isOversight ? (
        <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:grid-cols-[1fr_auto]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-600">
              Share Oversight
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              Monitoring Berbagi Dokumen
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pantau siapa membagikan dokumen ke siapa, permission, status baca, dan status unduh.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-lg font-black text-slate-950">{oversightStats.total}</p>
              <p className="text-[10px] font-bold uppercase text-slate-400">Total</p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3">
              <p className="text-lg font-black text-cyan-700">{oversightStats.sent}</p>
              <p className="text-[10px] font-bold uppercase text-cyan-600">Sent</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-lg font-black text-amber-700">{oversightStats.read}</p>
              <p className="text-[10px] font-bold uppercase text-amber-600">Read</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-lg font-black text-emerald-700">{oversightStats.downloaded}</p>
              <p className="text-[10px] font-bold uppercase text-emerald-600">Downloaded</p>
            </div>
          </div>
        </section>
      ) : null}

      <DataTable
        columns={columns}
        emptyText={
          isOversight
            ? 'Belum ada aktivitas berbagi dokumen.'
            : isIncoming
              ? 'Belum ada file masuk.'
              : 'Belum ada file terkirim.'
        }
        onSearch={setSearch}
        rows={filteredShares}
        search={search}
      />

      {(isIncoming || isOversight) && selectedShare ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">
                  {isOversight ? 'Share oversight' : 'Incoming share'}
                </p>
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
                {isOversight ? (
                  <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Receiver</span>
                    <span className="font-semibold text-slate-800">{selectedShare.receiver?.email ?? '-'}</span>
                  </div>
                ) : null}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Read At</span>
                  <span className="font-semibold text-slate-800">
                    {selectedShare.read_at ? formatDate(selectedShare.read_at) : 'Belum dibaca'}
                  </span>
                </div>
                <div className="grid gap-1 rounded-2xl bg-slate-50 p-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Downloaded At</span>
                  <span className="font-semibold text-slate-800">
                    {selectedShare.downloaded_at ? formatDate(selectedShare.downloaded_at) : 'Belum diunduh'}
                  </span>
                </div>
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
              {!isOversight && selectedShare.permission === 'download' ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => api.downloadDocument(selectedShare.document).catch(onError)}
                  type="button"
                >
                  <Download size={16} />
                  Download
                </button>
              ) : null}
              {!isOversight ? (
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  onClick={previewSelectedShare}
                  type="button"
                >
                  <Eye size={16} />
                  Preview File
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {isSent && shareToEdit ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Shared access</p>
                <h3 className="text-lg font-bold text-slate-950">Ubah Permission Share</h3>
              </div>
              <button
                aria-label="Close edit share permission"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={savingPermission}
                onClick={() => setShareToEdit(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-5" onSubmit={updateSharePermission}>
              <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Dokumen</p>
                  <p className="mt-1 break-words font-bold text-slate-950">
                    {shareToEdit.document?.original_name ?? 'Unknown document'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Penerima</p>
                  <p className="mt-1 font-bold text-slate-950">{shareToEdit.receiver?.name ?? '-'}</p>
                  <p className="text-slate-500">{shareToEdit.receiver?.email ?? '-'}</p>
                </div>
              </div>

              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>Permission</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  disabled={savingPermission}
                  onChange={(event) => setEditShareForm({ ...editShareForm, permission: event.target.value })}
                  value={editShareForm.permission}
                >
                  <option value="view">View</option>
                  <option value="download">Download</option>
                </select>
              </label>

              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>Message</span>
                <textarea
                  className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  disabled={savingPermission}
                  onChange={(event) => setEditShareForm({ ...editShareForm, message: event.target.value })}
                  rows="3"
                  value={editShareForm.message}
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingPermission}
                  onClick={() => setShareToEdit(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={savingPermission}
                  type="submit"
                >
                  {savingPermission ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isSent && shareToRevoke ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-rose-600">Shared access</p>
                <h3 className="text-lg font-bold text-slate-950">Cabut Akses Dokumen</h3>
              </div>
              <button
                aria-label="Close revoke confirmation"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={revoking}
                onClick={() => setShareToRevoke(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              <p className="text-sm font-medium text-slate-600">
                Apakah Anda yakin ingin mencabut akses dokumen ini?
              </p>
              <div className="grid gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Dokumen</p>
                  <p className="mt-1 break-words text-sm font-bold text-rose-950">
                    {shareToRevoke.document?.original_name ?? 'Unknown document'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-500">Penerima</p>
                  <p className="mt-1 text-sm font-bold text-rose-950">
                    {shareToRevoke.receiver?.name ?? '-'}
                  </p>
                  <p className="text-sm text-rose-800">{shareToRevoke.receiver?.email ?? '-'}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={revoking}
                  onClick={() => setShareToRevoke(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={revoking}
                  onClick={revokeShare}
                  type="button"
                >
                  {revoking ? 'Mencabut...' : 'Cabut Akses'}
                </button>
              </div>
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
