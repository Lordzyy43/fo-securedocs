import { useEffect, useState, useMemo } from 'react'
import { Plus, Edit2, UserCheck, UserX } from 'lucide-react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api, ApiError } from '../services/api.js'

export function UserManagementPage({ onError, onSuccess }) {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [addErrors, setAddErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role_id: '',
  })

  // Refresh data from event handlers
  async function refreshData() {
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        api.adminUsers(),
        api.roles(),
      ])
      setUsers(usersResponse.data ?? usersResponse)
      setRoles(rolesResponse)
    } catch (error) {
      onError(error)
    }
  }

  useEffect(() => {
    let active = true

    async function loadInitialData() {
      try {
        const [usersResponse, rolesResponse] = await Promise.all([
          api.adminUsers(),
          api.roles(),
        ])
        if (!active) return
        setUsers(usersResponse.data ?? usersResponse)
        setRoles(rolesResponse)
        if (rolesResponse.length > 0) {
          setAddForm((prev) => ({ ...prev, role_id: String(rolesResponse[0].id) }))
        }
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
  }, [onError])

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase()
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(keyword) ||
        u.email?.toLowerCase().includes(keyword) ||
        u.role?.name?.toLowerCase().includes(keyword)
    )
  }, [users, search])

  async function handleAddUser(event) {
    event.preventDefault()
    setSubmitting(true)
    setAddErrors({})
    try {
      await api.createAdminUser(addForm)
      setShowAddModal(false)
      setAddForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role_id: roles.length > 0 ? String(roles[0].id) : '',
      })
      onSuccess('Pengguna baru berhasil ditambahkan.')
      await refreshData()
    } catch (error) {
      if (error instanceof ApiError) {
        setAddErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEditUser(event) {
    event.preventDefault()
    if (!selectedUser) return
    setSubmitting(true)
    setEditErrors({})
    try {
      await api.updateAdminUser(selectedUser.id, editForm)
      setShowEditModal(false)
      setSelectedUser(null)
      onSuccess('Informasi pengguna berhasil diperbarui.')
      await refreshData()
    } catch (error) {
      if (error instanceof ApiError) {
        setEditErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleStatus(user) {
    const actionText = user.status === 'active' ? 'nonaktifkan' : 'aktifkan'
    const confirmed = window.confirm(`Apakah Anda yakin ingin me-${actionText} pengguna ${user.name}?`)
    if (!confirmed) return

    try {
      await api.toggleUserStatus(user.id)
      onSuccess(`Status pengguna ${user.name} berhasil diubah.`)
      await refreshData()
    } catch (error) {
      onError(error)
    }
  }

  function openEditModal(user) {
    setEditErrors({})
    setSelectedUser(user)
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      role_id: String(user.role_id ?? ''),
    })
    setShowEditModal(true)
  }

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (u) => (
        <div className="grid gap-1">
          <strong className="text-slate-950">{u.name}</strong>
          <span className="text-xs text-slate-400">ID: {u.id}</span>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
    },
    {
      key: 'role',
      label: 'Role',
      render: (u) => (
        <span className="capitalize font-medium text-slate-700">
          {u.role?.name ?? '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (u) => (
        <StatusBadge tone={u.status === 'active' ? 'success' : 'danger'}>
          {u.status}
        </StatusBadge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (u) => (
        <div className="flex flex-wrap items-center gap-2">
          <button
            aria-label="Edit user"
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={() => openEditModal(u)}
            type="button"
          >
            <Edit2 size={15} />
          </button>
          <button
            aria-label={u.status === 'active' ? 'Deactivate user' : 'Activate user'}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border shadow-sm transition ${
              u.status === 'active'
                ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
            onClick={() => handleToggleStatus(u)}
            type="button"
          >
            {u.status === 'active' ? <UserX size={15} /> : <UserCheck size={15} />}
          </button>
        </div>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-soft">
        Membuat daftar pengguna...
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {/* Top Header Card */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-tealbrand">Administrative panel</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Manage System Users</h2>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={() => {
            setAddErrors({})
            setShowAddModal(true)
          }}
          type="button"
        >
          <Plus size={16} />
          <span>Add New User</span>
        </button>
      </section>

      {/* Main Table */}
      <DataTable
        columns={columns}
        emptyText="Tidak ada data pengguna."
        onSearch={setSearch}
        rows={filteredUsers}
        search={search}
      />

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-950 mb-4">Add New User Account</h3>
            <form onSubmit={handleAddUser} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Full Name</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="John Doe"
                  required
                  type="text"
	                  value={addForm.name}
	                />
                  {addErrors.name?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{addErrors.name[0]}</p>
                  )}
	              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Email Address</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="john.doe@example.com"
                  required
                  type="email"
	                  value={addForm.email}
	                />
                  {addErrors.email?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{addErrors.email[0]}</p>
                  )}
	              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Password</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
	                  placeholder="Temporary password"
	                  required
	                  type="password"
	                  value={addForm.password}
	                />
                  {addErrors.password?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{addErrors.password[0]}</p>
                  )}
	              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Confirm Password</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setAddForm({ ...addForm, password_confirmation: e.target.value })}
                  placeholder="Repeat temporary password"
                  required
                  type="password"
                  value={addForm.password_confirmation}
                />
                {addErrors.password_confirmation?.[0] && (
                  <p className="text-xs font-semibold text-red-600">{addErrors.password_confirmation[0]}</p>
                )}
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Role Assignment</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setAddForm({ ...addForm, role_id: e.target.value })}
                  required
                  value={addForm.role_id}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
	                  ))}
	                </select>
                  {addErrors.role_id?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{addErrors.role_id[0]}</p>
                  )}
	              </label>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowAddModal(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-slate-950 mb-4">Edit User Account</h3>
            <form onSubmit={handleEditUser} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Full Name</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  type="text"
	                  value={editForm.name}
	                />
                  {editErrors.name?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{editErrors.name[0]}</p>
                  )}
	              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Email Address</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                  type="email"
	                  value={editForm.email}
	                />
                  {editErrors.email?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{editErrors.email[0]}</p>
                  )}
	              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Role Assignment</span>
                <select
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setEditForm({ ...editForm, role_id: e.target.value })}
                  required
                  value={editForm.role_id}
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
	                  ))}
	                </select>
                  {editErrors.role_id?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{editErrors.role_id[0]}</p>
                  )}
	              </label>

              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setShowEditModal(false)
                    setSelectedUser(null)
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
