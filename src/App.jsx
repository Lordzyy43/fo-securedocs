import { useEffect, useMemo, useState, useCallback } from "react";
import { AppLayout } from "./components/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { DocumentsPage } from "./pages/DocumentsPage.jsx";
import { SharesPage } from "./pages/SharesPage.jsx";
import { AuditLogsPage } from "./pages/AuditLogsPage.jsx";
import { UserManagementPage } from "./pages/UserManagementPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { api, ApiError } from "./services/api.js";


const INITIAL_VIEW = "dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState(null);

  const isAdmin = user?.role?.name === "admin";

  // Selaraskan judul dengan komponen AppLayout kustom baru kita
  const pageTitles = useMemo(
    () => ({
      dashboard: "Dashboard Overview",
      documents: isAdmin ? "All Documents" : "My Documents",
      upload: "Upload Documents",
      incoming: "Incoming Shares",
      sent: "Sent Shares",
      users: "User Management",
      profile: "Profile & Security",
      audit: "System Audit Logs",
    }),
    [isAdmin],
  );



  // Membungkus showError dengan useCallback agar referensi fungsinya stabil
  const showError = useCallback((error) => {
    let message = "Terjadi kesalahan sistem. Coba ulangi sebentar lagi.";

    if (error instanceof ApiError) {
      message = error.message;
      // Standar Produksi: Jika server mendeteksi 401 (Unauthorized) saat aplikasi berjalan,
      // paksa kick balik ke halaman login secara real-time.
      if (error.status === 401) {
        setUser(null);
        setView(INITIAL_VIEW);
        return;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    setNotice({ type: "error", message });
  }, []);

  // Fungsi untuk mengecek sesi user saat pertama kali aplikasi dimuat
  useEffect(() => {
    let isMounted = true;

    api
      .me()
      .then((userData) => {
        if (isMounted) setUser(userData);
      })
      .catch((err) => {
        if (isMounted) {
          setUser(null);
          // Tidak perlu memunculkan error berisik jika statusnya memang cuma belum login (401)
          if (err instanceof ApiError && err.status !== 401) {
            showError(err);
          }
        }
      })
      .finally(() => {
        if (isMounted) setBooting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [showError]);

  // Handler Aksi Login
  async function handleLogin(credentials) {
    try {
      setNotice(null);
      const response = await api.login(credentials);
      setUser(response.user);
      setView(INITIAL_VIEW);
      setNotice({
        type: "success",
        message: "Autentikasi berhasil. Selamat datang kembali.",
      });
    } catch (error) {
      showError(error);
      // Lempar balik error-nya agar LoginPage tahu kalau proses login gagal
      throw error;
    }
  }

  // Handler Aksi Logout
  async function handleLogout() {
    try {
      await api.logout();
    } catch (error) {
      console.error("Logout background network request failed:", error);
    } finally {
      // Standar keamanan produksi: Tetap hapus session di UI walaupun request API logout gagal/RTO
      setUser(null);
      setView(INITIAL_VIEW);
      setNotice(null);
    }
  }

  // Render komponen halaman secara dinamis berdasarkan state view
  function renderPage() {
    switch (view) {
      case "documents":
      case "upload":
        return (
          <DocumentsPage
            mode={view}
            isAdmin={isAdmin}
            onError={showError}
            onSuccess={(message) => setNotice({ type: "success", message })}
          />
        );
      case "incoming":
      case "sent":
        return <SharesPage mode={view} user={user} onError={showError} />;
      case "profile":
        return (
          <ProfilePage
            onError={showError}
            onSuccess={(message) => setNotice({ type: "success", message })}
            user={user}
            onUpdateUser={setUser}
          />
        );
      case "users":
        return isAdmin ? (
          <UserManagementPage
            onError={showError}
            onSuccess={(message) => setNotice({ type: "success", message })}
          />
        ) : (
          <DashboardPage
            user={user}
            isAdmin={isAdmin}
            onNavigate={setView}
            onError={showError}
          />
        );
      case "audit":
        return isAdmin ? (
          <AuditLogsPage onError={showError} />
        ) : (
          <DashboardPage
            user={user}
            isAdmin={isAdmin}
            onNavigate={setView}
            onError={showError}
          />
        );

      default:
        return (
          <DashboardPage
            user={user}
            isAdmin={isAdmin}
            onNavigate={setView}
            onError={showError}
          />
        );
    }
  }

  // 1. BOOTING SCREEN: Full Tailwind v4 Minimalis & Sangat Elegan
  if (booting) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] p-4 select-none">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tealbrand text-lg font-black text-white shadow-sm">
            S
          </div>
          <div className="text-center">
            <p className="text-sm font-bold tracking-tight text-slate-900">
              SecureDocs Workspace
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Initializing secure protocols...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // 2. JALUR UNTUK PENGGUNA YANG BELUM LOGIN
  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // 3. JALUR UTAMA UTK WORKSPACE DASHBOARD
  return (
    <AppLayout
      activeView={view}
      currentTitle={pageTitles[view] ?? "Dashboard Overview"}
      isAdmin={isAdmin}
      notice={notice}
      user={user}
      onDismissNotice={() => setNotice(null)}
      onLogout={handleLogout}
      onNavigate={setView}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
