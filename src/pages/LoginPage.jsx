import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { ApiError } from '../services/api.js'

export function LoginPage({ onLogin }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await onLogin(form)
    } catch (loginError) {
      setError(
        loginError instanceof ApiError
          ? loginError.message
          : 'Login gagal. Periksa email dan password.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>SecureDocs</strong>
            <span>Secure Digital Document Management</span>
          </div>
        </div>
        <div className="login-copy">
          <ShieldCheck size={30} />
          <h1>Dokumen terenkripsi, akses terkendali, aktivitas tercatat.</h1>
          <p>
            Workspace untuk upload, sharing, download, dan audit log dokumen sensitif
            sesuai PRD SDDMS.
          </p>
        </div>
      </section>

      <section className="login-card">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h2>Masuk ke workspace</h2>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <form onSubmit={submit}>
          <label>
            Email
            <span className="input-icon">
              <Mail size={17} />
              <input
                autoComplete="email"
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                type="email"
                value={form.email}
              />
            </span>
          </label>

          <label>
            Password
            <span className="input-icon">
              <LockKeyhole size={17} />
              <input
                autoComplete="current-password"
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                type="password"
                value={form.password}
              />
            </span>
          </label>

          <label className="check-row">
            <input
              checked={form.remember}
              onChange={(event) => setForm({ ...form, remember: event.target.checked })}
              type="checkbox"
            />
            Remember me
          </label>

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  )
}
