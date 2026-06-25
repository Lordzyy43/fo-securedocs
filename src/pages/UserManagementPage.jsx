import { useEffect, useState, useMemo } from 'react'
import { AlertTriangle, Edit2, KeyRound, LockKeyhole, Plus, ShieldCheck } from 'lucide-react'
import { DataTable } from '../components/DataTable.jsx'
import { StatusBadge } from '../components/StatusBadge.jsx'
import { api, ApiError } from '../services/api.js'

export function UserManagementPage({ currentUser, onError, onSuccess }) {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [togglingUserId, setTogglingUserId] = useState(null)
  const [resettingUserId, setResettingUserId] = useState(null)
  const [addErrors, setAddErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [resetPasswordErrors, setResetPasswordErrors] = useState({})
  const [resetPinErrors, setResetPinErrors] = useState({})

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [pendingStatusUser, setPendingStatusUser] = useState(null)
  const [pendingPasswordResetUser, setPendingPasswordResetUser] = useState(null)
  const [pendingPinResetUser, setPendingPinResetUser] = useState(null)
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
  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    password_confirmation: '',
    admin_pin: '',
  })
  const [resetPinForm, setResetPinForm] = useState({
    admin_pin: '',
  })

  function sanitizePin(value) {
    return value.replace(/\D/g, '').slice(0, 6)
  }

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
        (statusFilter === 'all' || u.status === statusFilter) &&
        (roleFilter === 'all' || u.role?.name === roleFilter) &&
        (u.name?.toLowerCase().includes(keyword) ||
          u.email?.toLowerCase().includes(keyword) ||
          u.role?.name?.toLowerCase().includes(keyword))
    )
  }, [users, search, statusFilter, roleFilter])

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
    setTogglingUserId(user.id)
    try {
      const updatedUser = await api.toggleUserStatus(user.id)
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === updatedUser.id ? updatedUser : item)),
      )
      onSuccess(
        updatedUser.status === 'active'
          ? `Akun ${updatedUser.name} berhasil diaktifkan.`
          : `Akun ${updatedUser.name} berhasil dinonaktifkan.`,
      )
      await refreshData()
    } catch (error) {
      onError(error)
    } finally {
      setTogglingUserId(null)
      setPendingStatusUser(null)
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault()
    if (!pendingPasswordResetUser) return

    setResettingUserId(pendingPasswordResetUser.id)
    setResetPasswordErrors({})
    try {
      const response = await api.resetAdminUserPassword(
        pendingPasswordResetUser.id,
        resetPasswordForm,
      )
      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === response.user.id ? response.user : item,
        ),
      )
      setPendingPasswordResetUser(null)
      setResetPasswordForm({
        password: '',
        password_confirmation: '',
        admin_pin: '',
      })
      onSuccess(response.message)
      await refreshData()
    } catch (error) {
      if (error instanceof ApiError) {
        setResetPasswordErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setResettingUserId(null)
    }
  }

  async function handleResetPin(event) {
    event.preventDefault()
    if (!pendingPinResetUser) return

    setResettingUserId(pendingPinResetUser.id)
    setResetPinErrors({})
    try {
      const response = await api.resetAdminUserPin(
        pendingPinResetUser.id,
        resetPinForm,
      )
      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.id === response.user.id ? response.user : item,
        ),
      )
      setPendingPinResetUser(null)
      setResetPinForm({
        admin_pin: '',
      })
      onSuccess(response.message)
      await refreshData()
    } catch (error) {
      if (error instanceof ApiError) {
        setResetPinErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setResettingUserId(null)
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
      label: 'Status & Access',
      render: (u) => {
        const isActive = u.status === 'active'
        const isSelf = currentUser?.id === u.id
        const isToggling = togglingUserId === u.id

        return (
          <div className="grid min-w-[210px] gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge tone={isActive ? 'success' : 'danger'}>
                {isActive ? 'active' : 'inactive'}
              </StatusBadge>
              {isSelf && (
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Akun Anda
                </span>
              )}
            </div>

            <button
              aria-checked={isActive}
              aria-label={isActive ? `Nonaktifkan ${u.name}` : `Aktifkan ${u.name}`}
              className={`group inline-flex w-fit items-center gap-3 rounded-full border px-2 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                isActive
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
              disabled={isSelf || isToggling}
              onClick={() => setPendingStatusUser(u)}
              role="switch"
              title={isSelf ? 'Admin tidak boleh menonaktifkan akun sendiri.' : undefined}
              type="button"
            >
              <span
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  isActive ? 'bg-emerald-500' : 'bg-rose-400'
                }`}
              >
                <span
                  className={`h-5 w-5 rounded-full bg-white shadow-sm transition ${
                    isActive ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </span>
              <span>
                {isToggling
                  ? 'Memproses...'
                  : isActive
                    ? 'Akun aktif'
                    : 'Akun nonaktif'}
              </span>
            </button>
          </div>
        )
      },
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
            aria-label={`Reset password ${u.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition hover:bg-amber-100"
            onClick={() => {
              setResetPasswordErrors({})
              setResetPasswordForm({
                password: '',
                password_confirmation: '',
                admin_pin: '',
              })
              setPendingPasswordResetUser(u)
            }}
            title="Reset password sementara"
            type="button"
          >
            <KeyRound size={15} />
          </button>
          <button
            aria-label={`Reset PIN ${u.name}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700 shadow-sm transition hover:bg-cyan-100"
            onClick={() => {
              setResetPinErrors({})
              setResetPinForm({
                admin_pin: '',
              })
              setPendingPinResetUser(u)
            }}
            title="Reset PIN"
            type="button"
          >
            <LockKeyhole size={15} />
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

      <section className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          <span>Filter Status</span>
          <select
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setStatusFilter(event.target.value)}
            value={statusFilter}
          >
            <option value="all">Semua status</option>
            <option value="active">Akun aktif</option>
            <option value="inactive">Akun nonaktif</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          <span>Filter Role</span>
          <select
            className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setRoleFilter(event.target.value)}
            value={roleFilter}
          >
            <option value="all">Semua role</option>
            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 lg:w-auto"
            onClick={() => {
              setStatusFilter('all')
              setRoleFilter('all')
              setSearch('')
            }}
            type="button"
          >
            Reset Filter
          </button>
        </div>
      </section>

      {/* Main Table */}
      <DataTable
        columns={columns}
        emptyText="Tidak ada data pengguna."
        onSearch={setSearch}
        rows={filteredUsers}
        search={search}
      />

      {pendingStatusUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 animate-in zoom-in-95 duration-150">
            <div
              className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl ${
                pendingStatusUser.status === 'active' ? 'bg-rose-300/30' : 'bg-emerald-300/30'
              }`}
            />
            <div className="relative flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  pendingStatusUser.status === 'active'
                    ? 'bg-rose-50 text-rose-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {pendingStatusUser.status === 'active' ? (
                  <AlertTriangle size={22} />
                ) : (
                  <ShieldCheck size={22} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                  Konfirmasi Status Akun
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  {pendingStatusUser.status === 'active'
                    ? 'Nonaktifkan akun ini?'
                    : 'Aktifkan kembali akun ini?'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {pendingStatusUser.status === 'active'
                    ? 'User tidak akan bisa login sampai admin mengaktifkan akunnya kembali.'
                    : 'User akan bisa login kembali menggunakan akun dan kredensial yang masih berlaku.'}
                </p>
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Target akun</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-950">{pendingStatusUser.name}</p>
                  <p className="text-xs font-medium text-slate-500">{pendingStatusUser.email}</p>
                </div>
                <StatusBadge tone={pendingStatusUser.status === 'active' ? 'success' : 'danger'}>
                  {pendingStatusUser.status === 'active' ? 'active' : 'inactive'}
                </StatusBadge>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={togglingUserId === pendingStatusUser.id}
                onClick={() => setPendingStatusUser(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className={`rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
                  pendingStatusUser.status === 'active'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                disabled={togglingUserId === pendingStatusUser.id}
                onClick={() => handleToggleStatus(pendingStatusUser)}
                type="button"
              >
                {togglingUserId === pendingStatusUser.id
                  ? 'Memproses...'
                  : pendingStatusUser.status === 'active'
                    ? 'Ya, Nonaktifkan'
                    : 'Ya, Aktifkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPasswordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 animate-in zoom-in-95 duration-150">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-300/30 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <KeyRound size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-600">
                  Reset Password Sementara
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  Reset password akun ini?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Admin hanya membuat password sementara. User tetap wajib mengganti password sendiri saat login berikutnya.
                </p>
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Target akun</p>
              <p className="mt-2 font-bold text-slate-950">{pendingPasswordResetUser.name}</p>
              <p className="text-xs font-medium text-slate-500">{pendingPasswordResetUser.email}</p>
            </div>

            <form className="relative mt-5 grid gap-4" onSubmit={handleResetPassword}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Password Sementara</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  onChange={(event) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      password: event.target.value,
                    })
                  }
                  placeholder="Masukkan password sementara"
                  required
                  type="password"
                  value={resetPasswordForm.password}
                />
                {resetPasswordErrors.password?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {resetPasswordErrors.password[0]}
                  </p>
                )}
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Konfirmasi Password Sementara</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  onChange={(event) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      password_confirmation: event.target.value,
                    })
                  }
                  placeholder="Ulangi password sementara"
                  required
                  type="password"
                  value={resetPasswordForm.password_confirmation}
                />
                {resetPasswordErrors.password_confirmation?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {resetPasswordErrors.password_confirmation[0]}
                  </p>
                )}
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>PIN Admin</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setResetPasswordForm({
                      ...resetPasswordForm,
                      admin_pin: sanitizePin(event.target.value),
                    })
                  }
                  placeholder="000000"
                  required
                  type="password"
                  value={resetPasswordForm.admin_pin}
                />
                {resetPasswordErrors.admin_pin?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {resetPasswordErrors.admin_pin[0]}
                  </p>
                )}
              </label>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
                Password disimpan dengan bcrypt. PIN admin dipakai untuk mengonfirmasi aksi sensitif ini.
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={resettingUserId === pendingPasswordResetUser.id}
                  onClick={() => {
                    setPendingPasswordResetUser(null)
                    setResetPasswordErrors({})
                    setResetPasswordForm({
                      password: '',
                      password_confirmation: '',
                      admin_pin: '',
                    })
                  }}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
                  disabled={resettingUserId === pendingPasswordResetUser.id}
                  type="submit"
                >
                  {resettingUserId === pendingPasswordResetUser.id
                    ? 'Memproses...'
                    : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pendingPinResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 animate-in zoom-in-95 duration-150">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/30 blur-3xl" />

            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <LockKeyhole size={22} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-600">
                  Reset PIN Keamanan
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  Reset PIN akun ini?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  PIN lama akan dihapus. Setelah login, user wajib membuat PIN baru sebelum dashboard terbuka.
                </p>
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Target akun</p>
              <p className="mt-2 font-bold text-slate-950">{pendingPinResetUser.name}</p>
              <p className="text-xs font-medium text-slate-500">{pendingPinResetUser.email}</p>
            </div>

            <div className="relative mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-xs leading-relaxed text-cyan-800">
              Masukkan PIN admin Anda untuk mengonfirmasi aksi sensitif ini. Reset PIN tidak mengubah password user.
            </div>

            <form className="relative mt-5 grid gap-4" onSubmit={handleResetPin}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>PIN Admin</span>
                <input
                  autoFocus
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) =>
                    setResetPinForm({
                      admin_pin: sanitizePin(event.target.value),
                    })
                  }
                  placeholder="000000"
                  required
                  type="password"
                  value={resetPinForm.admin_pin}
                />
                {resetPinErrors.admin_pin?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {resetPinErrors.admin_pin[0]}
                  </p>
                )}
              </label>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  disabled={resettingUserId === pendingPinResetUser.id}
                  onClick={() => {
                    setPendingPinResetUser(null)
                    setResetPinErrors({})
                    setResetPinForm({
                      admin_pin: '',
                    })
                  }}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-60"
                  disabled={resettingUserId === pendingPinResetUser.id}
                  type="submit"
                >
                  {resettingUserId === pendingPinResetUser.id
                    ? 'Memproses...'
                    : 'Ya, Reset PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
