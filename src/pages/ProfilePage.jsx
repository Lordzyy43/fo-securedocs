import { useState } from 'react'
import { CheckCircle2, Circle, KeyRound, LockKeyhole, Mail, Save, ShieldCheck, User } from 'lucide-react'
import { api, ApiError } from '../services/api.js'

const passwordRules = [
  {
    id: 'length',
    label: 'Minimal 8 karakter',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Ada huruf besar',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Ada huruf kecil',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'Ada angka',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'symbol',
    label: 'Ada simbol',
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
]

export function ProfilePage({ onError, onSuccess, user, onUpdateUser, requiresPasswordChange = false }) {
  const [profileForm, setProfileForm] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [pinForm, setPinForm] = useState({
    current_pin: '',
    pin: '',
    pin_confirmation: '',
  })
  const [activeModal, setActiveModal] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)

  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)
  const [updatingPin, setUpdatingPin] = useState(false)
  const [profileErrors, setProfileErrors] = useState({})
  const [passwordErrors, setPasswordErrors] = useState({})
  const [pinErrors, setPinErrors] = useState({})
  const passwordChecks = passwordRules.map((rule) => ({
    ...rule,
    passed: rule.test(passwordForm.password),
  }))
  const confirmationMatches =
    passwordForm.password.length > 0 &&
    passwordForm.password_confirmation.length > 0 &&
    passwordForm.password === passwordForm.password_confirmation
  const pinConfirmationMatches =
    pinForm.pin.length > 0 &&
    pinForm.pin_confirmation.length > 0 &&
    pinForm.pin === pinForm.pin_confirmation

  function sanitizePin(value) {
    return value.replace(/\D/g, '').slice(0, 6)
  }

  function requestProfileUpdate(e) {
    e.preventDefault()
    setConfirmAction('profile')
  }

  function requestPasswordUpdate(e) {
    e.preventDefault()
    setConfirmAction('password')
  }

  function requestPinUpdate(e) {
    e.preventDefault()
    setConfirmAction('pin')
  }

  async function handleUpdateProfile() {
    setUpdatingProfile(true)
    setProfileErrors({})
    try {
      const response = await api.updateProfile(profileForm)
      onUpdateUser(response.user)
      onSuccess('Informasi profil Anda berhasil diperbarui.')
      setActiveModal(null)
      setConfirmAction(null)
    } catch (error) {
      setConfirmAction(null)
      if (error instanceof ApiError) {
        setProfileErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function handleUpdatePassword() {
    setUpdatingPassword(true)
    setPasswordErrors({})
    try {
      const response = await api.changePassword(passwordForm)
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
      if (response?.user) onUpdateUser(response.user)
      onSuccess('Password Anda berhasil diubah.')
      setActiveModal(null)
      setConfirmAction(null)
    } catch (error) {
      setConfirmAction(null)
      if (error instanceof ApiError) {
        setPasswordErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function handleUpdatePin() {
    setUpdatingPin(true)
    setPinErrors({})
    try {
      const response = await api.changePin(pinForm)
      setPinForm({
        current_pin: '',
        pin: '',
        pin_confirmation: '',
      })
      if (response?.user) onUpdateUser(response.user)
      onSuccess('PIN keamanan berhasil diganti.')
      setActiveModal(null)
      setConfirmAction(null)
    } catch (error) {
      setConfirmAction(null)
      if (error instanceof ApiError) {
        setPinErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setUpdatingPin(false)
    }
  }

  function confirmDetails() {
    if (confirmAction === 'profile') {
      return {
        title: 'Simpan perubahan profil?',
        description: 'Nama dan email akun akan diperbarui pada session aktif.',
        tone: 'emerald',
        button: 'Ya, Simpan Profil',
        onConfirm: handleUpdateProfile,
        loading: updatingProfile,
      }
    }

    if (confirmAction === 'password') {
      return {
        title: 'Ganti password sekarang?',
        description: 'Setelah password diganti, gunakan password baru untuk login berikutnya.',
        tone: 'slate',
        button: 'Ya, Ganti Password',
        onConfirm: handleUpdatePassword,
        loading: updatingPassword,
      }
    }

    return {
      title: 'Ganti PIN sekarang?',
      description: 'PIN lama akan diganti dan PIN baru tetap disimpan sebagai hash bcrypt.',
      tone: 'emerald',
      button: 'Ya, Ganti PIN',
      onConfirm: handleUpdatePin,
      loading: updatingPin,
    }
  }

  return (
    <div className="grid gap-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-soft">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/10 text-2xl font-black text-emerald-200 shadow-lg">
              {(user.name || user.email || 'US').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
                Profile & Security
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{user.name}</h2>
              <p className="mt-1 text-sm font-medium text-slate-300">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100">
              <ShieldCheck size={15} />
              Role {user.role?.name ?? 'user'}
            </span>
            <span className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
              PIN aktif
            </span>
          </div>
        </div>
      </section>

      {requiresPasswordChange && (
        <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-sm font-semibold text-amber-900 shadow-soft">
          Akun ini masih memakai password sementara. Selesaikan penggantian password dulu sebelum mengubah nama atau email.
        </section>
      )}

      <section className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-tealbrand">Account Snapshot</p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">Ringkasan Akun</h3>
          <p className="mt-1 text-sm text-slate-500">
            Kelola identitas dan keamanan akun lewat tombol aksi di bawah.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
              <User size={17} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-400">Nama Saat Ini</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{user.name}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
              <Mail size={17} />
            </div>
            <p className="text-xs font-bold uppercase text-slate-400">Email Saat Ini</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-950">{user.email}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <button
          className="group rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
          disabled={requiresPasswordChange}
          onClick={() => {
            setProfileErrors({})
            setActiveModal('profile')
          }}
          type="button"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
            <Save size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-950">Ganti Nama & Email</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Perbarui identitas akun yang muncul di sistem.
          </p>
        </button>

        <button
          className="group rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg"
          onClick={() => {
            setPasswordErrors({})
            setActiveModal('password')
          }}
          type="button"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 transition group-hover:bg-cyan-600 group-hover:text-white">
            <KeyRound size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-950">Ganti Password</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Gunakan password kuat dengan huruf, angka, dan simbol.
          </p>
        </button>

        <button
          className="group rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg"
          onClick={() => {
            setPinErrors({})
            setActiveModal('pin')
          }}
          type="button"
        >
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
            <LockKeyhole size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-950">Ganti PIN</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Ubah PIN 6 angka untuk gerbang kedua sebelum dashboard.
          </p>
        </button>
      </section>

      {activeModal === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Save size={19} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">Ganti Nama & Email</h3>
                <p className="mt-1 text-xs text-slate-500">Perubahan langsung memperbarui data session akun.</p>
              </div>
            </div>

            <form onSubmit={requestProfileUpdate} className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Nama Lengkap</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  type="text"
                  value={profileForm.name}
                />
                {profileErrors.name?.[0] && (
                  <p className="text-xs font-semibold text-red-600">{profileErrors.name[0]}</p>
                )}
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Email</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  type="email"
                  value={profileForm.email}
                />
                {profileErrors.email?.[0] && (
                  <p className="text-xs font-semibold text-red-600">{profileErrors.email[0]}</p>
                )}
              </label>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setActiveModal(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  disabled={updatingProfile}
                  type="submit"
                >
                  <Save size={16} />
                  {updatingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300">
                <KeyRound size={19} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">Ganti Password</h3>
                <p className="mt-1 text-xs text-slate-500">Password baru wajib kuat dan berbeda dari password sekarang.</p>
              </div>
            </div>

            <form onSubmit={requestPasswordUpdate} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>Password Saat Ini</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    placeholder="••••••••"
                    required
                    type="password"
                    value={passwordForm.current_password}
                  />
                  {passwordErrors.current_password?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{passwordErrors.current_password[0]}</p>
                  )}
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>Password Baru</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                    placeholder="Minimal 8 karakter"
                    required
                    type="password"
                    value={passwordForm.password}
                  />
                  {passwordErrors.password?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{passwordErrors.password[0]}</p>
                  )}
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Checklist Password Baru</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {passwordChecks.map((rule) => (
                    <div
                      className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold ${
                        rule.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-white text-slate-400'
                      }`}
                      key={rule.id}
                    >
                      {rule.passed ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Konfirmasi Password Baru</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                  onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                  placeholder="Ulangi password baru"
                  required
                  type="password"
                  value={passwordForm.password_confirmation}
                />
                {passwordErrors.password_confirmation?.[0] && (
                  <p className="text-xs font-semibold text-red-600">{passwordErrors.password_confirmation[0]}</p>
                )}
                {passwordForm.password_confirmation ? (
                  <p className={`inline-flex items-center gap-2 text-xs font-semibold ${confirmationMatches ? 'text-emerald-700' : 'text-red-600'}`}>
                    {confirmationMatches ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    {confirmationMatches ? 'Konfirmasi password sudah sama.' : 'Konfirmasi password belum sama.'}
                  </p>
                ) : null}
              </label>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setActiveModal(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                  disabled={updatingPassword}
                  type="submit"
                >
                  {updatingPassword ? 'Mengganti password...' : 'Simpan Password Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeModal === 'pin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <LockKeyhole size={19} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-950">Ganti PIN</h3>
                <p className="mt-1 text-xs text-slate-500">PIN baru harus tepat 6 angka.</p>
              </div>
            </div>

            <form onSubmit={requestPinUpdate} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>PIN Saat Ini</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => setPinForm({ ...pinForm, current_pin: sanitizePin(e.target.value) })}
                    placeholder="000000"
                    required
                    type="password"
                    value={pinForm.current_pin}
                  />
                  {pinErrors.current_pin?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{pinErrors.current_pin[0]}</p>
                  )}
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>PIN Baru</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => setPinForm({ ...pinForm, pin: sanitizePin(e.target.value) })}
                    placeholder="000000"
                    required
                    type="password"
                    value={pinForm.pin}
                  />
                  {pinErrors.pin?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{pinErrors.pin[0]}</p>
                  )}
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span>Konfirmasi PIN</span>
                  <input
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(e) => setPinForm({ ...pinForm, pin_confirmation: sanitizePin(e.target.value) })}
                    placeholder="000000"
                    required
                    type="password"
                    value={pinForm.pin_confirmation}
                  />
                  {pinErrors.pin_confirmation?.[0] && (
                    <p className="text-xs font-semibold text-red-600">{pinErrors.pin_confirmation[0]}</p>
                  )}
                </label>
              </div>

              {pinForm.pin_confirmation ? (
                <p className={`inline-flex items-center gap-2 text-xs font-semibold ${pinConfirmationMatches ? 'text-emerald-700' : 'text-red-600'}`}>
                  {pinConfirmationMatches ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {pinConfirmationMatches ? 'Konfirmasi PIN sudah sama.' : 'Konfirmasi PIN belum sama.'}
                </p>
              ) : null}

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800">
                PIN tetap disimpan sebagai hash bcrypt, bukan angka asli.
              </div>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setActiveModal(null)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  disabled={updatingPin}
                  type="submit"
                >
                  {updatingPin ? 'Mengganti PIN...' : 'Simpan PIN Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 animate-in zoom-in-95 duration-150">
            <div
              className={`pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl ${
                confirmDetails().tone === 'slate' ? 'bg-cyan-300/30' : 'bg-emerald-300/30'
              }`}
            />
            <div className="relative flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  confirmDetails().tone === 'slate'
                    ? 'bg-slate-950 text-emerald-300'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {confirmAction === 'pin' ? (
                  <LockKeyhole size={21} />
                ) : confirmAction === 'password' ? (
                  <KeyRound size={21} />
                ) : (
                  <Save size={21} />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
                  Konfirmasi Perubahan
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  {confirmDetails().title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {confirmDetails().description}
                </p>
              </div>
            </div>

            <div className="relative mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={confirmDetails().loading}
                onClick={() => setConfirmAction(null)}
                type="button"
              >
                Batal
              </button>
              <button
                className={`rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition disabled:opacity-60 ${
                  confirmDetails().tone === 'slate'
                    ? 'bg-slate-950 hover:bg-slate-800'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
                disabled={confirmDetails().loading}
                onClick={confirmDetails().onConfirm}
                type="button"
              >
                {confirmDetails().loading ? 'Memproses...' : confirmDetails().button}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
