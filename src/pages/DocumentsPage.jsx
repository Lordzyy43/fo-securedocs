import { Download, Send, Trash2, Upload, Eye, X, PencilLine } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { createPreviewBlob, inferPreviewMimeType, isPreviewableMimeType } from '../utils/filePreview.js'
import { formatBytes, formatDate, getPageData } from '../utils/format.js'

export function DocumentsPage({ mode, isAdmin, onError, onSuccess }) {
  const [documents, setDocuments] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)
  const [shareForm, setShareForm] = useState({
    document_id: '',
    receiver_id: '',
    permission: 'download',
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
  const [editName, setEditName] = useState('')

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

    setUploading(true)
    try {
      await api.uploadDocument(selectedFile)
      setSelectedFile(null)
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

  async function deleteDocument(id) {
    const confirmed = window.confirm('Hapus dokumen ini?')
    if (!confirmed) return

    try {
      await api.deleteDocument(id)
      onSuccess('Dokumen berhasil dihapus.')
      await refreshData()
    } catch (error) {
      onError(error)
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
    setSharing(true)

    try {
      await api.createShare(shareForm)
      setShareForm({ document_id: '', receiver_id: '', permission: 'download', message: '' })
      onSuccess('Dokumen berhasil dibagikan.')
    } catch (error) {
      onError(error)
    } finally {
      setSharing(false)
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
                  onClick={() => setShareForm({ ...shareForm, document_id: String(document.id) })}
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
                  onClick={() => deleteDocument(document.id)}
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

      {/* RENDER TOP CARDS ONLY FOR NORMAL USERS */}
      {!isAdmin && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-600">Encrypted storage</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">Upload Document</h2>
              </div>
              <Upload className="text-cyan-600" size={24} />
            </div>

            <form className="grid gap-5" onSubmit={uploadDocument}>
              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>File</span>
                <input
                  accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  ref={fileInputRef}
                  required={mode === 'upload'}
                  type="file"
                />
              </label>
              <button
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!selectedFile || uploading}
                type="submit"
              >
                {uploading ? 'Uploading...' : 'Upload & Encrypt'}
              </button>
            </form>
          </section>

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

              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>Receiver</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setShareForm({ ...shareForm, receiver_id: event.target.value })}
                  required
                  value={shareForm.receiver_id}
                >
                  <option value="">Select receiver</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.email}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-3 text-sm font-semibold text-slate-700">
                <span>Permission</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(event) => setShareForm({ ...shareForm, permission: event.target.value })}
                  value={shareForm.permission}
                >
                  <option value="download">Download</option>
                  <option value="view">View only</option>
                </select>
              </label>

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
                disabled={sharing}
                type="submit"
              >
                {sharing ? 'Sharing...' : 'Share now'}
              </button>
            </form>
          </section>
        </div>
      )}

      {/* Main Table */}
      <DataTable
        columns={columns}
        emptyText={isAdmin ? "No documents found on system." : "No documents found."}
        onSearch={setSearch}
        rows={filteredDocuments}
        search={search}
      />

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
                  src={previewUrl}
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
