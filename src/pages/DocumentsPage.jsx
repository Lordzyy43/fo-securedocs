import { Check, Download, Eye, LockKeyhole, PencilLine, Search, Send, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import {
  createPreviewBlob,
  createRestrictedPdfViewerUrl,
  inferPreviewMimeType,
  isPreviewableMimeType,
} from '../utils/filePreview.js'
import { formatBytes, formatDate, getPageData } from '../utils/format.js'

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

export function DocumentsPage({
  mode,
  isAdmin,
  initialShareDocumentId = '',
  onError,
  onStartShare,
  onSuccess,
}) {
  const [documents, setDocuments] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [recipientSearch, setRecipientSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const isShareMode = mode === 'share-documents'
  const isDocumentsMode = mode === 'documents'
  const [shareForm, setShareForm] = useState({
    document_id: initialShareDocumentId ? String(initialShareDocumentId) : '',
    recipients: [],
    message: '',
  })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [renaming, setRenaming] = useState(false)
  // Preview States
  const [previewFile, setPreviewFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [editingDocument, setEditingDocument] = useState(null)
  const [documentToDelete, setDocumentToDelete] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Fetch function for event handlers (upload, delete, etc.)
  async function refreshData() {
    try {
      const requests = [api.documents()]
      if (!isAdmin) requests.push(api.users())

      const responses = await Promise.all(requests)
      setDocuments(getPageData(responses[0]))
      if (!isAdmin) setUsers(responses[1])
    } catch (error) {
      onError(error)
    }
  }

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      try {
        const requests = [api.documents()]
        if (!isAdmin) requests.push(api.users())

        const responses = await Promise.all(requests)
        if (!active) return
        setDocuments(getPageData(responses[0]))
        if (!isAdmin) setUsers(responses[1])
      } catch (error) {
        if (active) onError(error)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadInitialData()

    return () => {
      active = false
    }
  }, [isAdmin, onError])


  const filteredDocuments = useMemo(() => {
    const keyword = search.toLowerCase()
    return documents.filter((document) => document.original_name?.toLowerCase().includes(keyword))
  }, [documents, search])

  async function uploadDocument(event) {
    event.preventDefault()
    if (!selectedFile) return

    if (selectedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      onError(new Error('Ukuran file maksimal 10 MB. Pilih file yang lebih kecil.'))
      return
    }

    setUploading(true)
    try {
      await api.uploadDocument(selectedFile)
      setSelectedFile(null)
      setShowUploadModal(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onSuccess('Dokumen berhasil diupload dan dienkripsi.')
      await refreshData()
    } catch (error) {
      onError(error)
    } finally {
      setUploading(false)
    }
  }

  async function deleteDocument() {
    if (!documentToDelete) return

    setDeleting(true)
    try {
      await api.deleteDocument(documentToDelete.id)
      setDocumentToDelete(null)
      await refreshData()
      onSuccess('Dokumen berhasil dihapus.')
    } catch (error) {
      onError(error)
    } finally {
      setDeleting(false)
    }
  }

  function openRenameModal(document) {
    setEditingDocument(document)
    setEditName(document.original_name ?? '')
  }

  async function renameDocument(event) {
    event.preventDefault()
    if (!editingDocument || !editName.trim()) return

    setRenaming(true)
    try {
      await api.updateDocument(editingDocument.id, { original_name: editName.trim() })
      setEditingDocument(null)
      setEditName('')
      onSuccess('Nama dokumen berhasil diperbarui.')
      await refreshData()
    } catch (error) {
      onError(error)
    } finally {
      setRenaming(false)
    }
  }

  async function shareDocument(event) {
    event.preventDefault()
    if (!shareForm.recipients.length) return

    setSharing(true)

    try {
      await api.createShare({
        document_id: shareForm.document_id,
        recipients: shareForm.recipients.map((recipient) => ({
          receiver_id: Number(recipient.receiver_id),
          permission: recipient.permission,
        })),
        message: shareForm.message,
      })
      setShareForm({ document_id: '', recipients: [], message: '' })
      onSuccess(`Dokumen berhasil dibagikan ke ${shareForm.recipients.length} penerima.`)
    } catch (error) {
      onError(error)
    } finally {
      setSharing(false)
    }
  }

  function toggleRecipient(userId) {
    const receiverId = String(userId)
    const alreadySelected = shareForm.recipients.some((recipient) => recipient.receiver_id === receiverId)

    setShareForm({
      ...shareForm,
      recipients: alreadySelected
        ? shareForm.recipients.filter((recipient) => recipient.receiver_id !== receiverId)
        : [...shareForm.recipients, { receiver_id: receiverId, permission: 'view' }],
    })
  }

  function updateRecipientPermission(userId, permission) {
    const receiverId = String(userId)

    setShareForm({
      ...shareForm,
      recipients: shareForm.recipients.map((recipient) => (
        recipient.receiver_id === receiverId ? { ...recipient, permission } : recipient
      )),
    })
  }

  const selectedRecipients = useMemo(() => (
    shareForm.recipients
      .map((recipient) => ({
        ...recipient,
        user: users.find((user) => String(user.id) === recipient.receiver_id),
      }))
      .filter((recipient) => recipient.user)
  ), [shareForm.recipients, users])

  const filteredShareUsers = useMemo(() => {
    const keyword = recipientSearch.toLowerCase().trim()
    if (!keyword) return users

    return users.filter((user) => (
      [user.name, user.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    ))
  }, [recipientSearch, users])

  const sharePermissionStats = useMemo(() => ({
    view: selectedRecipients.filter((recipient) => recipient.permission === 'view').length,
    download: selectedRecipients.filter((recipient) => recipient.permission === 'download').length,
  }), [selectedRecipients])

  const selectedDocument = useMemo(
    () => documents.find((document) => String(document.id) === shareForm.document_id),
    [documents, shareForm.document_id],
  )

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

  const columns = [
    {
      key: 'original_name',
      label: 'File',
      render: (document) => (
        <div className="grid gap-1">
          <strong className="text-slate-950">{document.original_name}</strong>
          <span className="text-sm text-slate-500">{document.mime_type}</span>
        </div>
      ),
    },
    {
      key: 'file_size',
      label: 'Size',
      render: (document) => formatBytes(document.file_size),
    },
    {
      key: 'encrypted',
      label: 'Security',
      render: (document) => (
        <StatusBadge tone={document.encrypted ? 'success' : 'danger'}>
          {document.encrypted ? 'Encrypted' : 'Plain'}
        </StatusBadge>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'owner',
            label: 'Owner',
            render: (document) => document.owner?.email ?? '-',
          },
        ]
      : []),
    {
      key: 'created_at',
      label: 'Uploaded',
      render: (document) => formatDate(document.created_at),
    },
    ...(!isAdmin
      ? [
          {
            key: 'actions',
            label: 'Actions',
            render: (document) => (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  aria-label="Preview document"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  onClick={() => handlePreview(document)}
                  type="button"
                >
                  <Eye size={16} />
                </button>
                <button
                  aria-label="Download document"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  onClick={() => api.downloadDocument(document).catch(onError)}
                  type="button"
                >
                  <Download size={16} />
                </button>
                <button
                  aria-label="Select for sharing"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  onClick={() => {
                    if (onStartShare) {
                      onStartShare(String(document.id))
                      return
                    }

                    setShareForm({ ...shareForm, document_id: String(document.id) })
                  }}
                  type="button"
                >
                  <Send size={16} />
                </button>
                <button
                  aria-label="Rename document"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  onClick={() => openRenameModal(document)}
                  type="button"
                >
                  <PencilLine size={16} />
                </button>
                <button
                  aria-label="Delete document"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 shadow-sm transition hover:bg-rose-100"
                  onClick={() => setDocumentToDelete(document)}
                  type="button"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ]

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        Loading documents...
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

      {!isAdmin && isDocumentsMode ? (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-600">Encrypted storage</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Dokumen Saya</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kelola file terenkripsi milikmu. Upload dokumen baru lewat tombol kecil di kanan.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            onClick={() => setShowUploadModal(true)}
            type="button"
          >
            <Upload size={16} />
            Tambah Dokumen
          </button>
        </section>
      ) : null}

      {!isAdmin && isShareMode ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-600">Secure exchange</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Share Document</h2>
              </div>
              <Send className="text-slate-700" size={24} />
            </div>

            <form className="grid gap-5" onSubmit={shareDocument}>
              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>Document</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setShareForm({ ...shareForm, document_id: event.target.value })}
                  required
                  value={shareForm.document_id}
                >
                  <option value="">Select document</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.original_name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 text-sm font-semibold text-slate-700">
                <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50">
                  <div className="border-b border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-cyan-600">
                          Access recipients
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-950">
                          Pilih penerima & permission
                        </h3>
                        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                          Default akses adalah View only. Aktifkan Download hanya untuk penerima yang memang boleh menyimpan file.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={selectedRecipients.length ? 'info' : 'neutral'}>
                          {selectedRecipients.length} penerima
                        </StatusBadge>
                        <StatusBadge tone="neutral">{sharePermissionStats.view} view</StatusBadge>
                        <StatusBadge tone="success">{sharePermissionStats.download} download</StatusBadge>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50/70 p-3 text-xs font-semibold leading-relaxed text-cyan-900">
                      Dokumen yang dipilih:
                      <span className="ml-1 font-black text-cyan-950">
                        {selectedDocument?.original_name ?? 'Belum ada dokumen dipilih'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-4 p-4">
                    <label className="relative block">
                      <Search
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={16}
                      />
                      <input
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        onChange={(event) => setRecipientSearch(event.target.value)}
                        placeholder="Cari nama atau email penerima..."
                        type="search"
                        value={recipientSearch}
                      />
                    </label>

                    <div className="max-h-[24rem] overflow-y-auto pr-1">
                      {users.length ? (
                        filteredShareUsers.length ? (
                          <div className="grid gap-3">
                            {filteredShareUsers.map((user) => {
                              const selectedRecipient = shareForm.recipients.find(
                                (recipient) => recipient.receiver_id === String(user.id),
                              )

                              return (
                                <div
                                  className={`group rounded-[1.35rem] border bg-white p-3 transition ${
                                    selectedRecipient
                                      ? 'border-cyan-300 shadow-sm ring-4 ring-cyan-50'
                                      : 'border-slate-200 hover:border-cyan-200 hover:shadow-sm'
                                  }`}
                                  key={user.id}
                                >
                                  <div className="flex flex-wrap items-center gap-3">
                                    <button
                                      aria-pressed={Boolean(selectedRecipient)}
                                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border text-sm font-black transition ${
                                        selectedRecipient
                                          ? 'border-cyan-500 bg-cyan-500 text-white'
                                          : 'border-slate-200 bg-slate-50 text-slate-500 group-hover:border-cyan-200 group-hover:bg-cyan-50 group-hover:text-cyan-700'
                                      }`}
                                      onClick={() => toggleRecipient(user.id)}
                                      type="button"
                                    >
                                      {selectedRecipient ? <Check size={17} /> : user.name?.slice(0, 2).toUpperCase()}
                                    </button>

                                    <button
                                      className="min-w-0 flex-1 text-left"
                                      onClick={() => toggleRecipient(user.id)}
                                      type="button"
                                    >
                                      <span className="block truncate font-black text-slate-950">{user.name}</span>
                                      <span className="block truncate text-xs font-semibold text-slate-500">{user.email}</span>
                                    </button>

                                    <StatusBadge tone={selectedRecipient ? 'info' : 'neutral'}>
                                      {selectedRecipient ? 'Dipilih' : 'Belum dipilih'}
                                    </StatusBadge>
                                  </div>

                                  {selectedRecipient ? (
                                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-2">
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <button
                                          className={`rounded-xl px-3 py-3 text-left text-xs font-black transition ${
                                            selectedRecipient.permission === 'view'
                                              ? 'bg-slate-950 text-white shadow-sm'
                                              : 'bg-white text-slate-600 hover:bg-slate-100'
                                          }`}
                                          onClick={() => updateRecipientPermission(user.id, 'view')}
                                          type="button"
                                        >
                                          <span className="flex items-center gap-2">
                                            <Eye size={15} />
                                            View only
                                          </span>
                                          <span className="mt-1 block text-[11px] font-semibold opacity-75">
                                            Bisa melihat/preview, tidak bisa download.
                                          </span>
                                        </button>
                                        <button
                                          className={`rounded-xl px-3 py-3 text-left text-xs font-black transition ${
                                            selectedRecipient.permission === 'download'
                                              ? 'bg-emerald-600 text-white shadow-sm'
                                              : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                                          }`}
                                          onClick={() => updateRecipientPermission(user.id, 'download')}
                                          type="button"
                                        >
                                          <span className="flex items-center gap-2">
                                            <Download size={15} />
                                            Download
                                          </span>
                                          <span className="mt-1 block text-[11px] font-semibold opacity-75">
                                            Bisa preview dan mengunduh dokumen.
                                          </span>
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
                            Tidak ada user yang cocok dengan pencarian.
                          </p>
                        )
                      ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">
                          Belum ada user aktif yang bisa dipilih sebagai penerima.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedRecipients.length ? (
                  <div className="rounded-[1.75rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 to-white p-4">
                    <div className="mb-3 flex items-center gap-2 text-cyan-800">
                      <LockKeyhole size={16} />
                      <p className="text-xs font-black uppercase tracking-[0.2em]">Ringkasan akses final</p>
                    </div>
                    <div className="grid gap-2">
                      {selectedRecipients.map((recipient) => (
                        <div
                          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white bg-white/90 px-3 py-2 shadow-sm"
                          key={recipient.receiver_id}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-900">{recipient.user.name}</p>
                            <p className="truncate text-xs font-medium text-slate-500">{recipient.user.email}</p>
                          </div>
                          <StatusBadge tone={recipient.permission === 'download' ? 'success' : 'neutral'}>
                            {recipient.permission === 'download' ? 'Download allowed' : 'View only'}
                          </StatusBadge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>Message</span>
                <textarea
                  className="min-h-[120px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setShareForm({ ...shareForm, message: event.target.value })}
                  rows="3"
                  value={shareForm.message}
                />
              </label>

              <button
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={sharing || !shareForm.document_id || !shareForm.recipients.length}
                type="submit"
              >
                {sharing ? 'Sharing...' : `Share to ${shareForm.recipients.length || 0} receiver`}
              </button>
            </form>
          </section>
      ) : null}

      {isDocumentsMode ? (
        <DataTable
          columns={columns}
          emptyText={isAdmin ? "No documents found on system." : "No documents found."}
          onSearch={setSearch}
          rows={filteredDocuments}
          search={search}
        />
      ) : null}

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Encrypted upload</p>
                <h3 className="text-lg font-bold text-slate-950">Tambah Dokumen</h3>
                <p className="mt-1 text-sm text-slate-500">
                  File akan divalidasi, dienkripsi, lalu masuk ke daftar Dokumen Saya. Maksimal 10 MB.
                </p>
              </div>
              <button
                aria-label="Close upload dialog"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={uploading}
                onClick={() => {
                  setShowUploadModal(false)
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-5" onSubmit={uploadDocument}>
              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>File</span>
                <input
                  accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  ref={fileInputRef}
                  required
                  type="file"
                />
                {selectedFile ? (
                  <span className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                    selectedFile.size > MAX_UPLOAD_SIZE_BYTES
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-cyan-50 text-cyan-700'
                  }`}>
                    {selectedFile.name} - {formatBytes(selectedFile.size)}
                    {selectedFile.size > MAX_UPLOAD_SIZE_BYTES ? ' - Melebihi batas 10 MB' : ''}
                  </span>
                ) : null}
              </label>

              <div className="flex items-center justify-end gap-3">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={uploading}
                  onClick={() => {
                    setShowUploadModal(false)
                    setSelectedFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!selectedFile || uploading}
                  type="submit"
                >
                  {uploading ? 'Uploading...' : 'Upload & Encrypt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Document metadata</p>
                <h3 className="text-lg font-bold text-slate-950">Rename Document</h3>
              </div>
              <button
                aria-label="Close rename dialog"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setEditingDocument(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <form className="grid gap-4" onSubmit={renameDocument}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>File name</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  maxLength={255}
                  onChange={(event) => setEditName(event.target.value)}
                  required
                  type="text"
                  value={editName}
                />
              </label>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setEditingDocument(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={renaming || !editName.trim()}
                  type="submit"
                >
                  {renaming ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {documentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-rose-600">Document removal</p>
                <h3 className="text-lg font-bold text-slate-950">Hapus Dokumen</h3>
              </div>
              <button
                aria-label="Close delete confirmation"
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={deleting}
                onClick={() => setDocumentToDelete(null)}
                type="button"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid gap-4">
              <p className="text-sm font-medium text-slate-600">
                Apakah Anda yakin ingin menghapus dokumen ini?
              </p>
              <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-500">File</p>
                <p className="mt-1 break-words text-sm font-bold text-rose-950">
                  {documentToDelete.original_name ?? 'Unknown document'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deleting}
                  onClick={() => setDocumentToDelete(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={deleting}
                  onClick={deleteDocument}
                  type="button"
                >
                  {deleting ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewFile && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-600">Secure Preview</p>
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
                  src={previewFile.mime_type === 'application/pdf' ? createRestrictedPdfViewerUrl(previewUrl) : previewUrl}
                  title={previewFile.original_name}
                  className="w-full h-[60vh] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center p-8 max-w-md">
                  <p className="text-sm font-bold text-slate-700 mb-2">Pratinjau Tidak Didukung</p>
                  <p className="text-xs text-slate-500">
                    Format file ({previewFile.mime_type}) tidak mendukung rendering langsung di browser. Silakan unduh dokumen untuk membacanya.
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
