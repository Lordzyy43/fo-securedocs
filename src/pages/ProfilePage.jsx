import { useState } from 'react'
import { User, KeyRound, ShieldCheck } from 'lucide-react'
import { api } from '../services/api.js'

export function ProfilePage({ onError, onSuccess, user, onUpdateUser }) {
  const [profileForm, setProfileForm] = useState({
    name: user.name ?? '',
    email: user.email ?? '',
  })

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  const [updatingProfile, setUpdatingProfile] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setUpdatingProfile(true)
    try {
      const response = await api.updateProfile(profileForm)
      onUpdateUser(response.user)
      onSuccess('Informasi profil Anda berhasil diperbarui.')
    } catch (error) {
      onError(error)
    } finally {
      setUpdatingProfile(false)
    }
  }

  async function handleUpdatePassword(e) {
    e.preventDefault()
    setUpdatingPassword(true)
    try {
      await api.changePassword(passwordForm)
      setPasswordForm({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
      onSuccess('Password Anda berhasil diubah.')
    } catch (error) {
      onError(error)
    } finally {
      setUpdatingPassword(false)
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

      {/* Forms Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Update Profile Card */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <User size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-950">Personal Information</h3>
              <p className="text-xs text-slate-400">Update your account name and email address.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>Full Name</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                required
                type="text"
                value={profileForm.name}
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>Email Address</span>
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                required
                type="email"
                value={profileForm.email}
              />
            </label>

            <button
              className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              disabled={updatingProfile}
              type="submit"
            >
              {updatingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
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
            </label>

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
      </div>
    </div>
  )
}
