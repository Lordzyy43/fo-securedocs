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

function firstValidationMessage(errors = {}) {
  return Object.values(errors)
    .flat()
    .find((message) => typeof message === 'string' && message.length > 0)
}

function resolveErrorMessage(data, status) {
  if (typeof data === 'string' && data.trim()) return data
  if (data?.message) return data.message

  const validationMessage = firstValidationMessage(data?.errors)
  if (validationMessage) return validationMessage

  if (status === 419) return 'Sesi keamanan sudah kedaluwarsa. Silakan refresh halaman lalu coba lagi.'
  if (status === 403) return 'Akses ditolak. Akun Anda tidak memiliki izin untuk aksi ini.'
  if (status === 404) return 'Data yang diminta tidak ditemukan.'
  if (status >= 500) return 'Server sedang bermasalah. Silakan coba lagi sebentar lagi.'

  return 'Permintaan gagal diproses. Periksa input lalu coba lagi.'
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
  const { _csrfRetried = false, ...fetchOptions } = options
  const method = options.method ?? 'GET'
  const isWrite = !['GET', 'HEAD'].includes(method.toUpperCase())
  const headers = {
    Accept: 'application/json',
    ...(fetchOptions.body instanceof FormData ? {} : jsonHeaders),
    ...(fetchOptions.headers ?? {}),
  }

  if (isWrite) {
    headers['X-CSRF-TOKEN'] = await getCsrfToken()
  }

  const response = await fetch(path, {
    credentials: 'include',
    ...fetchOptions,
    method,
    headers,
  })

  if (response.status === 419 && isWrite && ! _csrfRetried) {
    csrfToken = null
    return request(path, { ...fetchOptions, _csrfRetried: true })
  }

  if (response.status === 204) {
    if (path === '/logout') csrfToken = null
    return null
  }

  const contentType = response.headers.get('content-type') ?? ''
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new ApiError(
      resolveErrorMessage(data, response.status),
      response.status,
      data?.errors ?? {},
    )
  }

  if (path === '/logout') csrfToken = null

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
  resetCsrfToken: () => {
    csrfToken = null
  },
  me: () => request('/me'),
  login: (payload) =>
    request('/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  logout: () => request('/logout', { method: 'POST' }),
  setupPin: (payload) =>
    request('/pin/setup', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  verifyPin: (payload) =>
    request('/pin/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  changePin: (payload) =>
    request('/pin/change', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
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
