import { Download, Send, Trash2, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api } from '../services/api.js'
import { formatBytes, formatDate, getPageData } from '../utils/format.js'

export function DocumentsPage({ mode, onError, onSuccess }) {
  const [documents, setDocuments] = useState([])
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [shareForm, setShareForm] = useState({
    document_id: '',
    receiver_id: '',
    permission: 'download',
    message: '',
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [documentResponse, userResponse] = await Promise.all([api.documents(), api.users()])
      setDocuments(getPageData(documentResponse))
      setUsers(userResponse)
    } catch (error) {
      onError(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    Promise.all([api.documents(), api.users()])
      .then(([documentResponse, userResponse]) => {
        if (!active) return
        setDocuments(getPageData(documentResponse))
        setUsers(userResponse)
      })
      .catch(onError)
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [onError])

  const filteredDocuments = useMemo(() => {
    const keyword = search.toLowerCase()
    return documents.filter((document) =>
      document.original_name?.toLowerCase().includes(keyword),
    )
  }, [documents, search])

  async function uploadDocument(event) {
    event.preventDefault()
    if (!selectedFile) return

    setSubmitting(true)
    try {
      await api.uploadDocument(selectedFile)
      setSelectedFile(null)
      onSuccess('Dokumen berhasil diupload dan dienkripsi.')
      await loadData()
    } catch (error) {
      onError(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteDocument(id) {
    const confirmed = window.confirm('Hapus dokumen ini?')
    if (!confirmed) return

    try {
      await api.deleteDocument(id)
      onSuccess('Dokumen berhasil dihapus.')
      await loadData()
    } catch (error) {
      onError(error)
    }
  }

  async function shareDocument(event) {
    event.preventDefault()
    setSubmitting(true)

    try {
      await api.createShare(shareForm)
      setShareForm({ document_id: '', receiver_id: '', permission: 'download', message: '' })
      onSuccess('Dokumen berhasil dibagikan.')
    } catch (error) {
      onError(error)
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'original_name',
      label: 'File',
      render: (document) => (
        <div className="file-cell">
          <strong>{document.original_name}</strong>
          <small>{document.mime_type}</small>
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
    {
      key: 'created_at',
      label: 'Uploaded',
      render: (document) => formatDate(document.created_at),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (document) => (
        <div className="row-actions">
          <button
            aria-label="Download document"
            className="icon-button"
            onClick={() => api.downloadDocument(document).catch(onError)}
            type="button"
          >
            <Download size={16} />
          </button>
          <button
            aria-label="Select for sharing"
            className="icon-button"
            onClick={() => setShareForm({ ...shareForm, document_id: String(document.id) })}
            type="button"
          >
            <Send size={16} />
          </button>
          <button
            aria-label="Delete document"
            className="icon-button danger"
            onClick={() => deleteDocument(document.id)}
            type="button"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ]

  if (loading) return <div className="panel loading-panel">Loading documents...</div>

  return (
    <div className="page-stack">
      <div className="form-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Encrypted storage</p>
              <h2>Upload Document</h2>
            </div>
            <Upload size={22} />
          </div>

          <form className="stack-form" onSubmit={uploadDocument}>
            <label>
              File
              <input
                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                required={mode === 'upload'}
                type="file"
              />
            </label>
            <button className="primary-button" disabled={!selectedFile || submitting} type="submit">
              {submitting ? 'Uploading...' : 'Upload & Encrypt'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Secure exchange</p>
              <h2>Share Document</h2>
            </div>
            <Send size={22} />
          </div>

          <form className="stack-form" onSubmit={shareDocument}>
            <label>
              Document
              <select
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

            <label>
              Receiver
              <select
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

            <label>
              Permission
              <select
                onChange={(event) => setShareForm({ ...shareForm, permission: event.target.value })}
                value={shareForm.permission}
              >
                <option value="download">Download</option>
                <option value="view">View only</option>
              </select>
            </label>

            <label>
              Message
              <textarea
                onChange={(event) => setShareForm({ ...shareForm, message: event.target.value })}
                rows="3"
                value={shareForm.message}
              />
            </label>

            <button className="secondary-button" disabled={submitting} type="submit">
              Share
            </button>
          </form>
        </section>
      </div>

      <DataTable
        columns={columns}
        emptyText="Belum ada dokumen."
        onSearch={setSearch}
        rows={filteredDocuments}
        search={search}
      />
    </div>
  )
}
