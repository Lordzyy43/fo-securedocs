import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AppLayout } from "./components/AppLayout.jsx";
import { LoginPage } from "./pages/LoginPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { DocumentsPage } from "./pages/DocumentsPage.jsx";
import { SharesPage } from "./pages/SharesPage.jsx";
import { AuditLogsPage } from "./pages/AuditLogsPage.jsx";
import { UserManagementPage } from "./pages/UserManagementPage.jsx";
import { ProfilePage } from "./pages/ProfilePage.jsx";
import { api, ApiError } from "./services/api.js";
import { getPageData } from "./utils/format.js";


const INITIAL_VIEW = "dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [pendingPasswordChangeUser, setPendingPasswordChangeUser] = useState(null);
  const [pendingPinUser, setPendingPinUser] = useState(null);
  const [view, setView] = useState(INITIAL_VIEW);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState(null);
  const [loginNotice, setLoginNotice] = useState(null);
  const [incomingUnreadCount, setIncomingUnreadCount] = useState(0);
  const [sharesRefreshToken, setSharesRefreshToken] = useState(0);
  const unreadFetchInFlightRef = useRef(false);

  const isAdmin = user?.role?.name === "admin";
  const mustChangePassword = Boolean(user?.force_password_change);
  const activeView = mustChangePassword ? "profile" : view;

  // Selaraskan judul dengan komponen AppLayout kustom baru kita
  const pageTitles = useMemo(
    () => ({
      dashboard: "Dashboard Overview",
      documents: isAdmin ? "All Documents" : "My Documents",
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
        setLoginNotice({
          type: "error",
          message: "Sesi Anda sudah berakhir. Silakan login ulang untuk melanjutkan.",
        });
        return;
      }
    } else if (error instanceof Error) {
      message = error.message;
    }

    setNotice({ type: "error", message });
  }, []);

  const refreshIncomingUnreadCount = useCallback(async () => {
    if (!user || isAdmin) {
      setIncomingUnreadCount(0);
      return;
    }

    if (unreadFetchInFlightRef.current) return;

    unreadFetchInFlightRef.current = true;

    try {
      const response = await api.shares();
      const shares = getPageData(response);
      setIncomingUnreadCount(
        shares.filter((share) => share.receiver_id === user.id && share.status === "sent").length,
      );
    } catch (error) {
      showError(error);
    } finally {
      unreadFetchInFlightRef.current = false;
    }
  }, [isAdmin, showError, user]);

  const refreshShareData = useCallback(() => {
    refreshIncomingUnreadCount();
    setSharesRefreshToken((token) => token + 1);
  }, [refreshIncomingUnreadCount]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      refreshIncomingUnreadCount();
    });

    if (!user || isAdmin || !["incoming", "sent"].includes(activeView)) {
      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    const interval = window.setInterval(refreshShareData, 5000);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [activeView, isAdmin, refreshIncomingUnreadCount, refreshShareData, user]);

  // Fungsi untuk mengecek sesi user saat pertama kali aplikasi dimuat
  useEffect(() => {
    let isMounted = true;

    api
      .me()
      .then((userData) => {
        if (isMounted) {
          if (userData.force_password_change) {
            setPendingPasswordChangeUser(userData);
            setPendingPinUser(null);
            setUser(null);
          } else if (!userData.has_pin || !userData.pin_verified) {
            setPendingPasswordChangeUser(null);
            setPendingPinUser(userData);
            setUser(null);
          } else {
            setPendingPasswordChangeUser(null);
            setPendingPinUser(null);
            setUser(userData);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setUser(null);
          setPendingPasswordChangeUser(null);
          setPendingPinUser(null);
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
      setLoginNotice(null);
      const response = await api.login(credentials);
      if (response.user.force_password_change) {
        setPendingPasswordChangeUser(response.user);
        setPendingPinUser(null);
        setUser(null);
        return {
          requiresPasswordChange: true,
          user: response.user,
        };
      }

      if (!response.user.has_pin || !response.user.pin_verified) {
        setPendingPasswordChangeUser(null);
        setPendingPinUser(response.user);
        setUser(null);
        return {
          requiresPin: true,
          user: response.user,
        };
      }

      setPendingPasswordChangeUser(null);
      setPendingPinUser(null);
      setUser(response.user);
      setView(INITIAL_VIEW);
      setNotice({
        type: "success",
        message: "Autentikasi berhasil. Selamat datang kembali.",
      });
      return {
        requiresPasswordChange: false,
        user: response.user,
      };
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
      setPendingPasswordChangeUser(null);
      setPendingPinUser(null);
      setView(INITIAL_VIEW);
      setNotice(null);
      setLoginNotice(null);
    }
  }

  async function handlePasswordChanged() {
    setPendingPasswordChangeUser(null);
    setPendingPinUser(null);
    setUser(null);
    setView(INITIAL_VIEW);
    setNotice(null);
    api.resetCsrfToken();
  }

  function handlePinCompleted(verifiedUser) {
    setPendingPasswordChangeUser(null);
    setPendingPinUser(null);
    setUser(verifiedUser);
    setView(INITIAL_VIEW);
    setNotice({
      type: "success",
      message: "PIN berhasil diverifikasi. Selamat datang kembali.",
    });
  }

  // Render komponen halaman secara dinamis berdasarkan state view
  function renderPage() {
    switch (activeView) {
      case "documents":
        return (
          <DocumentsPage
            mode={activeView}
            isAdmin={isAdmin}
            onError={showError}
            onSuccess={(message) => setNotice({ type: "success", message })}
          />
        );
      case "incoming":
      case "sent":
        return (
          <SharesPage
            mode={activeView}
            user={user}
            onError={showError}
            onSuccess={(message) => setNotice({ type: "success", message })}
            onSharesChanged={refreshShareData}
            refreshToken={sharesRefreshToken}
          />
        );
      case "profile":
        return (
          <ProfilePage
            onError={showError}
            onSuccess={(message) => setNotice({ type: "success", message })}
            user={user}
            onUpdateUser={setUser}
            requiresPasswordChange={mustChangePassword}
          />
        );
      case "users":
        return isAdmin ? (
          <UserManagementPage
            currentUser={user}
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
    return (
      <LoginPage
        pendingPasswordChangeUser={pendingPasswordChangeUser}
        pendingPinUser={pendingPinUser}
        loginNotice={loginNotice}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onPasswordChanged={handlePasswordChanged}
        onPinCompleted={handlePinCompleted}
      />
    );
  }

  // 3. JALUR UTAMA UTK WORKSPACE DASHBOARD
  return (
    <AppLayout
      activeView={activeView}
      currentTitle={pageTitles[activeView] ?? "Dashboard Overview"}
      isAdmin={isAdmin}
      incomingUnreadCount={incomingUnreadCount}
      notice={notice}
      user={user}
      onDismissNotice={() => setNotice(null)}
      onLogout={handleLogout}
      onNavigate={(nextView) => {
        if (mustChangePassword && nextView !== "profile") {
          setNotice({
            type: "error",
            message: "Anda wajib mengganti password sementara sebelum mengakses fitur lain.",
          });
          setView("profile");
          return;
        }

        setView(nextView);
      }}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
