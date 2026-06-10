const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

let csrfToken = null

export class ApiError extends Error {
  constructor(message, status, errors = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken

  const response = await fetch('/csrf-token', {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  const data = await response.json()
  csrfToken = data.token

  return csrfToken
}

async function request(path, options = {}) {
  const method = options.method ?? 'GET'
  const isWrite = !['GET', 'HEAD'].includes(method.toUpperCase())
  const headers = {
    Accept: 'application/json',
    ...(options.body instanceof FormData ? {} : jsonHeaders),
    ...(options.headers ?? {}),
  }

  if (isWrite) {
    headers['X-CSRF-TOKEN'] = await getCsrfToken()
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    method,
    headers,
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new ApiError(
      data?.message || 'Request failed.',
      response.status,
      data?.errors ?? {},
    )
  }

  return data
}

function toQuery(params = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, value)
    }
  })

  const text = query.toString()
  return text ? `?${text}` : ''
}

export const api = {
  me: () => request('/me'),
  login: (payload) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request('/logout', { method: 'POST' }),
  users: () => request('/users'),
  documents: (params) => request(`/documents${toQuery(params)}`),
  uploadDocument: (file) => {
    const body = new FormData()
    body.append('document', file)

    return request('/documents', {
      method: 'POST',
      body,
    })
  },
  updateDocument: (id, payload) =>
    request(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: 'DELETE' }),
  previewDocumentUrl: (file) => `/documents/${file.id}/preview`,
  previewDocument: async (file) => {
    const response = await fetch(`/documents/${file.id}/preview`, {
      credentials: 'include',
      headers: { Accept: '*/*' },
    })

    if (!response.ok) {
      throw new ApiError('Preview ditolak atau file tidak tersedia.', response.status)
    }

    return response.blob()
  },
  downloadDocument: async (file) => {
    const response = await fetch(`/documents/${file.id}/download`, {
      credentials: 'include',
      headers: { Accept: '*/*' },
    })

    if (!response.ok) {
      throw new ApiError('Download ditolak atau file tidak tersedia.', response.status)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.original_name ?? 'document'
    anchor.click()
    URL.revokeObjectURL(url)
  },
  shares: (params) => request(`/document-shares${toQuery(params)}`),
  createShare: (payload) =>
    request('/document-shares', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteShare: (id) => request(`/document-shares/${id}`, { method: 'DELETE' }),
  auditLogs: (params) => request(`/audit-logs${toQuery(params)}`),
  updateProfile: (payload) =>
    request('/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  changePassword: (payload) =>
    request('/change-password', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminUsers: (params) => request(`/admin/users${toQuery(params)}`),
  createAdminUser: (payload) =>
    request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateAdminUser: (id, payload) =>
    request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  toggleUserStatus: (id) =>
    request(`/admin/users/${id}/toggle-status`, {
      method: 'PUT',
    }),
  roles: () => request('/roles'),
}

