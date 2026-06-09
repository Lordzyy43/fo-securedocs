import {
  BarChart3,
  Bell,
  FileText,
  Inbox,
  LogOut,
  Menu,
  ScrollText,
  Send,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { useState } from 'react'

const baseItems = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'documents', label: 'My Documents', icon: FileText },
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'incoming', label: 'Incoming', icon: Inbox },
  { id: 'sent', label: 'Sent', icon: Send },
]

const adminItems = [{ id: 'audit', label: 'Audit Logs', icon: ScrollText }]

export function AppLayout({
  activeView,
  children,
  currentTitle,
  isAdmin,
  notice,
  onDismissNotice,
  onLogout,
  onNavigate,
  user,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const items = isAdmin ? [...baseItems, ...adminItems] : baseItems

  function navigate(view) {
    onNavigate(view)
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>SecureDocs</strong>
            <span>Encrypted DMS</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={activeView === item.id ? 'active' : ''}
                key={item.id}
                onClick={() => navigate(item.id)}
                type="button"
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <ShieldCheck size={18} />
          <span>AES-256 ready workflow</span>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <button
            aria-label="Open menu"
            className="icon-button mobile-only"
            onClick={() => setSidebarOpen(true)}
            type="button"
          >
            <Menu size={20} />
          </button>

          <div>
            <p className="eyebrow">{user.role?.name ?? 'user'} workspace</p>
            <h1>{currentTitle}</h1>
          </div>

          <div className="topbar-actions">
            <button aria-label="Notifications" className="icon-button" type="button">
              <Bell size={18} />
            </button>
            <div className="user-chip">
              <span>{user.name?.slice(0, 1).toUpperCase()}</span>
              <div>
                <strong>{user.name}</strong>
                <small>{user.email}</small>
              </div>
            </div>
            <button className="ghost-button" onClick={onLogout} type="button">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {notice ? (
          <div className={`notice ${notice.type}`}>
            <span>{notice.message}</span>
            <button aria-label="Dismiss alert" onClick={onDismissNotice} type="button">
              <X size={16} />
            </button>
          </div>
        ) : null}

        <main className="content">{children}</main>
      </div>

      {sidebarOpen ? (
        <button
          aria-label="Close menu"
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}
    </div>
  )
}
