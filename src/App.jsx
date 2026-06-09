import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { AppLayout } from './components/AppLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { DashboardPage } from './pages/DashboardPage.jsx'
import { DocumentsPage } from './pages/DocumentsPage.jsx'
import { SharesPage } from './pages/SharesPage.jsx'
import { AuditLogsPage } from './pages/AuditLogsPage.jsx'
import { api, ApiError } from './services/api.js'

const initialView = 'dashboard'

function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState(initialView)
  const [booting, setBooting] = useState(true)
  const [notice, setNotice] = useState(null)

  const isAdmin = user?.role?.name === 'admin'

  const pages = useMemo(
    () => ({
      dashboard: 'Dashboard',
      documents: 'Documents',
      upload: 'Upload Document',
      incoming: 'Incoming Files',
      sent: 'Sent Files',
      audit: 'Audit Logs',
    }),
    [],
  )

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setBooting(false))
  }, [])

  async function handleLogin(credentials) {
    const response = await api.login(credentials)
    setUser(response.user)
    setView(initialView)
    setNotice({ type: 'success', message: 'Login berhasil. Dashboard siap.' })
  }

  async function handleLogout() {
    await api.logout()
    setUser(null)
    setView(initialView)
    setNotice(null)
  }

  function showError(error) {
    setNotice({
      type: 'error',
      message:
        error instanceof ApiError
          ? error.message
          : 'Terjadi kesalahan. Coba ulangi sebentar lagi.',
    })
  }

  function renderPage() {
    if (view === 'documents' || view === 'upload') {
      return (
        <DocumentsPage
          mode={view}
          onError={showError}
          onSuccess={(message) => setNotice({ type: 'success', message })}
        />
      )
    }

    if (view === 'incoming' || view === 'sent') {
      return <SharesPage mode={view} user={user} onError={showError} />
    }

    if (view === 'audit' && isAdmin) {
      return <AuditLogsPage onError={showError} />
    }

    return (
      <DashboardPage
        user={user}
        isAdmin={isAdmin}
        onNavigate={setView}
        onError={showError}
      />
    )
  }

  if (booting) {
    return (
      <main className="boot-screen">
        <div className="brand-mark">S</div>
        <p>Preparing secure workspace...</p>
      </main>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <AppLayout
      activeView={view}
      currentTitle={pages[view] ?? 'Dashboard'}
      isAdmin={isAdmin}
      notice={notice}
      user={user}
      onDismissNotice={() => setNotice(null)}
      onLogout={handleLogout}
      onNavigate={setView}
    >
      {renderPage()}
    </AppLayout>
  )
}

export default App
