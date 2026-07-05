import {
  AlertCircle,
  LayoutDashboard, // Menggantikan BarChart3 untuk Dashboard yang lebih umum
  FolderLock, // Menggantikan FileText untuk My Documents (kesan terenkripsi)
  Inbox,
  FileSpreadsheet, // Menggantikan Send untuk Sent (representasi file terkirim)
  Send,
  ShieldCheck,
  History, // Menggantikan ScrollText untuk Audit Logs (jejak riwayat)
  Users, // Icon untuk User Management
  User, // Icon untuk Profile & Security
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const baseItems = [
  { id: "dashboard", label: "Dashboard", description: "Ringkasan aktivitas", icon: LayoutDashboard },
  { id: "documents", label: "Dokumen Saya", description: "Kelola file pribadi", icon: FolderLock },
  { id: "share-documents", label: "Share Document", description: "Bagikan dokumen", icon: Send },
  { id: "incoming", label: "Dibagikan ke Saya", description: "Dokumen masuk", icon: Inbox },
  { id: "sent", label: "Riwayat Berbagi", description: "Dokumen terkirim", icon: FileSpreadsheet },
  { id: "profile", label: "Profil & Keamanan", description: "Password dan PIN", icon: User },
];


const adminItems = [
  { id: "users", label: "User & Role Management", description: "Akun, role, reset akses", icon: Users },
  { id: "audit", label: "Security Audit Trail", description: "Log aktivitas sensitif", icon: History },
];

const userNavSections = [
  {
    label: "Workspace",
    items: baseItems.filter((item) => ["dashboard", "documents", "share-documents"].includes(item.id)),
  },
  {
    label: "Kolaborasi",
    items: baseItems.filter((item) => ["incoming", "sent"].includes(item.id)),
  },
  {
    label: "Akun",
    items: baseItems.filter((item) => item.id === "profile"),
  },
];

const adminNavSections = [
  {
    label: "Control Center",
    items: [
      { id: "dashboard", label: "Command Center", description: "Ringkasan sistem", icon: LayoutDashboard },
    ],
  },
  {
    label: "Administration",
    items: adminItems,
  },
  {
    label: "Account",
    items: [
      { id: "profile", label: "My Profile & Security", description: "Password dan PIN", icon: User },
    ],
  },
];


export function AppLayout({
  activeView,
  children,
  currentTitle,
  incomingUnreadCount = 0,
  isAdmin,
  notice,
  onDismissNotice,
  onLogout,
  onNavigate,
  user,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const dismissTimerRef = useRef(null);
  const notificationRef = useRef(null);
  const removeTimerRef = useRef(null);
  const navSections = isAdmin ? adminNavSections : userNavSections;

  const notifications = [
    !isAdmin && incomingUnreadCount > 0
      ? {
          id: "incoming-share",
          title: `${incomingUnreadCount} dokumen baru dibagikan`,
          description: "Ada dokumen masuk yang belum kamu buka.",
          tone: "teal",
          actionLabel: "Lihat dokumen",
          actionView: "incoming",
        }
      : null,
    {
      id: "secure-session",
      title: "Sesi keamanan aktif",
      description: "Password, PIN, dan enkripsi dokumen sedang aktif.",
      tone: "slate",
      actionLabel: "Profil & Keamanan",
      actionView: "profile",
    },
    isAdmin
      ? {
          id: "audit-ready",
          title: "Audit trail tersedia",
          description: "Pantau aktivitas login, share, download, dan perubahan akses.",
          tone: "amber",
          actionLabel: "Buka audit",
          actionView: "audit",
        }
      : null,
  ].filter(Boolean);

  const clearToastTimers = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }

    if (removeTimerRef.current) {
      clearTimeout(removeTimerRef.current);
      removeTimerRef.current = null;
    }
  }, []);

  const dismissToast = useCallback(() => {
    clearToastTimers();
    setToastVisible(false);
    removeTimerRef.current = setTimeout(() => {
      onDismissNotice();
      removeTimerRef.current = null;
    }, 200);
  }, [clearToastTimers, onDismissNotice]);

  useEffect(() => {
    if (!notice) {
      clearToastTimers();
      const frame = requestAnimationFrame(() => {
        setToastVisible(false);
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }

    clearToastTimers();

    const frame = requestAnimationFrame(() => {
      setToastVisible(true);
    });

    dismissTimerRef.current = setTimeout(() => {
      dismissToast();
    }, 4000);

    return () => {
      cancelAnimationFrame(frame);
      clearToastTimers();
    };
  }, [clearToastTimers, dismissToast, notice]);

  useEffect(() => {
    if (!notificationOpen) return undefined;

    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setNotificationOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationOpen]);

  function navigate(view) {
    onNavigate(view);
    setSidebarOpen(false);
    setNotificationOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 selection:bg-tealbrand/10 selection:text-tealbrand">
      <div className="flex">
        {/* SIDEBAR COMPONENT (Solid Dark Elegant) */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col justify-between border-r border-slate-800 bg-darkslate px-6 py-6 text-slate-100 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
          }`}
        >
          <div className="flex min-h-0 flex-col gap-7">
            {/* Header Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tealbrand font-extrabold text-white shadow-sm">
                  S
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-white">
                    SecureDocs
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    {isAdmin ? "Admin Control Panel" : "Encrypted Workspace"}
                  </p>
                </div>
              </div>

              {/* Tombol Close Mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
                type="button"
                aria-label="Close Sidebar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu Navigasi Admin Panel */}
            <nav className="min-h-0 space-y-5 overflow-y-auto pr-1" aria-label="Main navigation">
              {navSections.map((section) => (
                <div className="space-y-2" key={section.label}>
                  <p className="px-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeView === item.id;

                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.id)}
                          type="button"
                          className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all duration-150 ${
                            isActive
                              ? "bg-slate-800 text-teal-300 shadow-sm ring-1 ring-teal-400/15"
                              : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                              isActive
                                ? "bg-tealbrand/15 text-teal-300"
                                : "bg-slate-900 text-slate-500 group-hover:text-slate-200"
                            }`}
                          >
                            <Icon size={17} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">
                              {item.label}
                            </span>
                            <span
                              className={`mt-0.5 block truncate text-[10px] font-medium ${
                                isActive ? "text-teal-100/70" : "text-slate-500"
                              }`}
                            >
                              {item.description}
                            </span>
                          </span>
                          {item.id === "incoming" && incomingUnreadCount > 0 ? (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-tealbrand px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                              {incomingUnreadCount}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Footer Sidebar (Status Enkripsi) */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-slate-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-tealbrand/10 text-teal-400">
              <ShieldCheck size={16} />
            </div>
            <div className="leading-tight">
              <p className="text-xs font-bold text-slate-300">AES-256 Active</p>
              <p className="text-[10px] font-medium text-slate-500">
                Secured Session
              </p>
            </div>
          </div>
        </aside>

        {/* WRAPPER KONTEN UTAMA */}
        <div className="min-w-0 flex-1">
          {/* HEADER / TOPBAR (Solid, Flat, Minimalist Elegant) */}
          <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-gray-200 bg-white px-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:px-8">
            <div className="flex items-center gap-4">
              {/* Trigger Sidebar Mobile */}
              <button
                aria-label="Open menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
                onClick={() => setSidebarOpen(true)}
                type="button"
              >
                <Menu size={18} />
              </button>

              {/* Judul Halaman */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {user.role?.name ?? "user"} panel
                </p>
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {currentTitle}
                </h1>
              </div>
            </div>

            {/* Aksi & Profil Pengguna */}
            <div className="flex items-center gap-4">
              {/* Tombol Notifikasi */}
              <div className="relative" ref={notificationRef}>
                <button
                  aria-expanded={notificationOpen}
                  aria-label="Notifications"
                  className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                    notificationOpen
                      ? "border-teal-200 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  onClick={() => setNotificationOpen((open) => !open)}
                  type="button"
                >
                  <Bell size={18} />
                  {incomingUnreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-tealbrand px-1 text-[9px] font-black leading-4 text-white shadow-sm">
                      {incomingUnreadCount > 9 ? "9+" : incomingUnreadCount}
                    </span>
                  ) : (
                    <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tealbrand" />
                  )}
                </button>

                {notificationOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15 animate-in fade-in zoom-in-95 duration-150">
                    <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-600">
                            Notification
                          </p>
                          <h2 className="mt-1 text-sm font-black text-slate-950">
                            Pusat Informasi
                          </h2>
                        </div>
                        <button
                          aria-label="Close notifications"
                          className="rounded-xl p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                          onClick={() => setNotificationOpen(false)}
                          type="button"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[24rem] space-y-2 overflow-y-auto p-3">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <button
                            className="group flex w-full gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-50"
                            key={notification.id}
                            onClick={() => navigate(notification.actionView)}
                            type="button"
                          >
                            <span
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                                notification.tone === "teal"
                                  ? "bg-teal-50 text-teal-700"
                                  : notification.tone === "amber"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {notification.id === "incoming-share" ? <Inbox size={17} /> : <AlertCircle size={17} />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-bold text-slate-950">
                                {notification.title}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {notification.description}
                              </span>
                              <span className="mt-2 inline-flex text-xs font-black text-teal-700 group-hover:text-teal-800">
                                {notification.actionLabel}
                              </span>
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="rounded-2xl bg-slate-50 p-5 text-center">
                          <p className="text-sm font-bold text-slate-800">Belum ada notifikasi baru.</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Aktivitas share dan keamanan akan muncul di sini.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Informasi User Profil */}
              <div className="hidden items-center gap-2.5 rounded-lg border border-gray-200 bg-slate-50 p-1 pr-3.5 lg:flex">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-tealbrand text-white text-xs font-bold">
                  {user.name?.slice(0, 1).toUpperCase()}
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-bold text-slate-900">
                    {user.name}
                  </p>
                  <p className="text-[10px] font-medium text-slate-400">
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Tombol Logout */}
              <button
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                onClick={onLogout}
                type="button"
              >
                <LogOut size={14} className="text-slate-500" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </header>

          {/* TOAST NOTIFIKASI */}
          {notice ? (
            <div
              className={`fixed right-4 top-4 z-50 w-[calc(100vw-2rem)] max-w-sm transition-all duration-200 ease-out sm:right-6 sm:top-6 ${
                toastVisible
                  ? "translate-y-0 opacity-100 scale-100"
                  : "-translate-y-3 opacity-0 scale-95"
              }`}
            >
              <div
                className={`flex items-start justify-between gap-4 rounded-xl border p-4 text-sm font-semibold shadow-2xl backdrop-blur ${
                  notice.type === "success"
                    ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
                    : "border-rose-200 bg-rose-50/95 text-rose-950"
                }`}
              >
                <p className="leading-5">{notice.message}</p>
                <button
                  aria-label="Close notification"
                  className="shrink-0 rounded-md p-1 text-current opacity-60 transition hover:bg-white/60 hover:opacity-100"
                  onClick={dismissToast}
                  type="button"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : null}

          {/* WRAPPER HALAMAN UTAMA */}
          <main className="px-6 py-6 lg:px-8">
            <div className="animate-in fade-in duration-200">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
