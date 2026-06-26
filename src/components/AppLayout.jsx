import {
  LayoutDashboard, // Menggantikan BarChart3 untuk Dashboard yang lebih umum
  FolderLock, // Menggantikan FileText untuk My Documents (kesan terenkripsi)
  Inbox,
  FileSpreadsheet, // Menggantikan Send untuk Sent (representasi file terkirim)
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
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "documents", label: "My Documents", icon: FolderLock },
  { id: "incoming", label: "Incoming Shares", icon: Inbox },
  { id: "sent", label: "Sent Shares", icon: FileSpreadsheet },
  { id: "profile", label: "Profile & Security", icon: User },
];


const adminItems = [
  { id: "users", label: "User Management", icon: Users },
  { id: "audit", label: "Audit Logs", icon: History },
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
  const [toastVisible, setToastVisible] = useState(false);
  const dismissTimerRef = useRef(null);
  const removeTimerRef = useRef(null);
  const items = isAdmin ? [...baseItems, ...adminItems] : baseItems;

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

  function navigate(view) {
    onNavigate(view);
    setSidebarOpen(false);
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
          <div className="flex flex-col gap-8">
            {/* Header Brand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-tealbrand font-extrabold text-white shadow-sm">
                  S
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight text-white">
                    SecureDocs
                  </p>
                  <p className="text-[11px] font-medium text-slate-400">
                    Encrypted DMS
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

            {/* Menu Navigasi (Ikon Baru & Desain Minimalis) */}
            <nav className="space-y-1" aria-label="Main navigation">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    type="button"
                    className={`group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? "bg-slate-800 text-teal-400"
                        : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-100"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`transition-colors duration-150 ${
                        isActive
                          ? "text-teal-400"
                          : "text-slate-400 group-hover:text-slate-200"
                      }`}
                    />
                    <span className="min-w-0 flex-1">{item.label}</span>
                    {!isAdmin && item.id === "incoming" && incomingUnreadCount > 0 ? (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-tealbrand px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">
                        {incomingUnreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
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
              <button
                aria-label="Notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                type="button"
              >
                <Bell size={18} />
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-tealbrand" />
              </button>

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
