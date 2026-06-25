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

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setUpdatingProfile(true)
    setProfileErrors({})
    try {
      const response = await api.updateProfile(profileForm)
      onUpdateUser(response.user)
      onSuccess('Informasi profil Anda berhasil diperbarui.')
    } catch (error) {
      if (error instanceof ApiError) {
        setProfileErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
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
    } catch (error) {
      if (error instanceof ApiError) {
        setPasswordErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setUpdatingPassword(false)
    }
  }

  async function handleUpdatePin(e) {
    e.preventDefault()
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
    } catch (error) {
      if (error instanceof ApiError) {
        setPinErrors(error.errors ?? {})
      }
      onError(error)
    } finally {
      setUpdatingPin(false)
    }
  }

  return (
    <div className="grid gap-6">
      {/* Header Info Card */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-tealbrand/10 text-tealbrand text-xl font-bold">
            {user.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-tealbrand">Profile Settings</p>
            <h2 className="text-2xl font-semibold text-slate-950">{user.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600">
          <ShieldCheck className="text-tealbrand" size={16} />
          <span className="capitalize">{user.role?.name ?? 'User'} Role</span>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className={`overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft ${requiresPasswordChange ? 'opacity-60' : ''}`}>
          <div className="border-b border-slate-200 bg-slate-950 p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">Account Identity</p>
                <h3 className="mt-2 text-2xl font-semibold">{profileForm.name || user.name}</h3>
                <p className="mt-1 text-sm text-slate-300">{profileForm.email || user.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100">
                {user.role?.name ?? 'user'}
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="grid content-start gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                  <User size={18} />
                </div>
                <p className="text-xs font-bold uppercase text-slate-400">Nama Saat Ini</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950">{user.name}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                  <Mail size={18} />
                </div>
                <p className="text-xs font-bold uppercase text-slate-400">Email Saat Ini</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-950">{user.email}</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="grid content-start gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Edit Nama dan Email</h3>
                <p className="mt-1 text-xs text-slate-500">Perubahan akan langsung memperbarui data session akun.</p>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Nama Lengkap</span>
                <input
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  required
                  disabled={requiresPasswordChange}
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
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  required
                  disabled={requiresPasswordChange}
                  type="email"
                  value={profileForm.email}
                />
                {profileErrors.email?.[0] && (
                  <p className="text-xs font-semibold text-red-600">{profileErrors.email[0]}</p>
                )}
              </label>

              <button
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                disabled={updatingProfile || requiresPasswordChange}
                type="submit"
              >
                <Save size={16} />
                {updatingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </form>
          </div>
        </section>

        {/* Change Password Card */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Security Credentials</h3>
              <p className="text-xs text-slate-400">Change your password periodically to stay secure.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>Current Password</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
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
              <span>New Password</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                placeholder="At least 8 characters"
                required
                type="password"
                value={passwordForm.password}
              />
              {passwordErrors.password?.[0] && (
                <p className="text-xs font-semibold text-red-600">{passwordErrors.password[0]}</p>
              )}
            </label>

            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Syarat Password Baru</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {passwordChecks.map((rule) => (
                  <div
                    className={`flex items-center gap-2 text-xs font-semibold ${
                      rule.passed ? 'text-emerald-700' : 'text-slate-400'
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
              <span>Confirm New Password</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                placeholder="Confirm your new password"
                required
                type="password"
                value={passwordForm.password_confirmation}
              />
              {passwordErrors.password_confirmation?.[0] && (
                <p className="text-xs font-semibold text-red-600">{passwordErrors.password_confirmation[0]}</p>
              )}
              {passwordForm.password_confirmation ? (
                <p
                  className={`inline-flex items-center gap-2 text-xs font-semibold ${
                    confirmationMatches ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {confirmationMatches ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {confirmationMatches ? 'Konfirmasi password sudah sama.' : 'Konfirmasi password belum sama.'}
                </p>
              ) : null}
            </label>

            <button
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={updatingPassword}
              type="submit"
            >
              {updatingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </section>

        {/* Change PIN Card */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft lg:col-start-2">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <LockKeyhole size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Ganti PIN</h3>
              <p className="text-xs text-slate-400">PIN dipakai sebagai gerbang kedua sebelum dashboard terbuka.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePin} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>PIN Saat Ini</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
              <span>Konfirmasi PIN Baru</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center font-mono text-lg tracking-[0.35em] text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
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
              {pinForm.pin_confirmation ? (
                <p
                  className={`inline-flex items-center gap-2 text-xs font-semibold ${
                    pinConfirmationMatches ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {pinConfirmationMatches ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {pinConfirmationMatches ? 'Konfirmasi PIN sudah sama.' : 'Konfirmasi PIN belum sama.'}
                </p>
              ) : null}
            </label>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800">
              PIN baru hanya boleh 6 angka dan tetap disimpan sebagai hash bcrypt, bukan angka asli.
            </div>

            <button
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              disabled={updatingPin}
              type="submit"
            >
              {updatingPin ? 'Mengganti PIN...' : 'Simpan PIN Baru'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
