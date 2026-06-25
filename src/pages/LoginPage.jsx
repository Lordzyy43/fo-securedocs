import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../components/ui/Button.jsx";
import { api, ApiError } from "../services/api.js";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi.")
    .email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
  remember: z.boolean(),
});

const passwordRules = [
  {
    id: "length",
    label: "Minimal 8 karakter",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "Ada huruf besar",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "Ada huruf kecil",
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "Ada angka",
    test: (password) => /\d/.test(password),
  },
  {
    id: "symbol",
    label: "Ada simbol",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

function PinBoxes({ value, tone = "emerald" }) {
  const activeClasses =
    tone === "cyan"
      ? "border-cyan-400 bg-cyan-50 text-cyan-900 shadow-cyan-100"
      : "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-emerald-100";

  return (
    <div className="grid grid-cols-6 gap-2">
      {Array.from({ length: 6 }).map((_, index) => {
        const filled = Boolean(value[index]);

        return (
          <div
            className={`flex h-12 items-center justify-center rounded-2xl border text-lg font-black shadow-sm transition-all ${
              filled
                ? activeClasses
                : "border-slate-200 bg-white text-slate-300"
            }`}
            key={index}
          >
            {filled ? "•" : ""}
          </div>
        );
      })}
    </div>
  );
}

export function LoginPage({
  pendingPasswordChangeUser = null,
  pendingPinUser = null,
  onLogin,
  onLogout,
  onPasswordChanged,
  onPinCompleted,
}) {
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordInfo, setShowForgotPasswordInfo] = useState(false);
  const [bannerError, setBannerError] = useState("");
  const [bannerSuccess, setBannerSuccess] = useState("");
  const [passwordChangeUser, setPasswordChangeUser] = useState(pendingPasswordChangeUser);
  const [pinChallengeUser, setPinChallengeUser] = useState(pendingPinUser);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [pinForm, setPinForm] = useState({
    pin: "",
    pin_confirmation: "",
  });
  const [pinErrors, setPinErrors] = useState({});
  const [submittingPin, setSubmittingPin] = useState(false);
  const passwordChecks = passwordRules.map((rule) => ({
    ...rule,
    passed: rule.test(passwordForm.password),
  }));
  const confirmationMatches =
    passwordForm.password.length > 0 &&
    passwordForm.password_confirmation.length > 0 &&
    passwordForm.password === passwordForm.password_confirmation;

  useEffect(() => {
    setPasswordChangeUser(pendingPasswordChangeUser);
  }, [pendingPasswordChangeUser]);

  useEffect(() => {
    setPinChallengeUser(pendingPinUser);
  }, [pendingPinUser]);

  async function submit(values) {
    setBannerError("");
    setBannerSuccess("");
    try {
      const result = await onLogin(values);
      if (result?.requiresPasswordChange) {
        setPinChallengeUser(null);
        setPasswordChangeUser(result.user);
        setPasswordForm({
          current_password: values.password,
          password: "",
          password_confirmation: "",
        });
        setPasswordErrors({});
      }
      if (result?.requiresPin) {
        setPasswordChangeUser(null);
        setPinChallengeUser(result.user);
        setPinForm({
          pin: "",
          pin_confirmation: "",
        });
        setPinErrors({});
      }
    } catch (err) {
      if (err instanceof ApiError) {
        Object.entries(err.errors ?? {}).forEach(([field, messages]) => {
          setFieldError(field, {
            type: "server",
            message: messages?.[0] ?? err.message,
          });
        });
      }

      setBannerError(
        err instanceof ApiError
          ? err.message
          : "Autentikasi gagal. Silakan coba kembali.",
      );
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordErrors({});
    setBannerError("");

    try {
      const response = await api.changePassword(passwordForm);
      const email = passwordChangeUser?.email ?? "";
      api.resetCsrfToken();
      setPasswordChangeUser(null);
      setPasswordForm({
        current_password: "",
        password: "",
        password_confirmation: "",
      });
      await onPasswordChanged();
      reset({
        email,
        password: "",
        remember: false,
      });
      setBannerSuccess(response?.message ?? "Password berhasil diganti. Silakan login ulang dengan password baru.");
    } catch (err) {
      if (err instanceof ApiError) {
        setPasswordErrors(err.errors ?? {});
        setBannerError(err.message);
      } else {
        setBannerError("Password gagal diganti. Silakan coba kembali.");
      }
    } finally {
      setChangingPassword(false);
    }
  }

  async function cancelPasswordChange() {
    setPasswordChangeUser(null);
    setPasswordForm({
      current_password: "",
      password: "",
      password_confirmation: "",
    });
    setPasswordErrors({});
    await onLogout();
  }

  function sanitizePin(value) {
    return value.replace(/\D/g, "").slice(0, 6);
  }

  async function processPin(nextForm = pinForm) {
    if (!pinChallengeUser || submittingPin) return;

    const isVerifyReady = pinChallengeUser.has_pin && nextForm.pin.length === 6;
    const isSetupReady =
      !pinChallengeUser.has_pin &&
      nextForm.pin.length === 6 &&
      nextForm.pin_confirmation.length === 6 &&
      nextForm.pin === nextForm.pin_confirmation;

    if (!isVerifyReady && !isSetupReady) return;

    setSubmittingPin(true);
    setPinErrors({});
    setBannerError("");
    setBannerSuccess("");

    try {
      const payload = pinChallengeUser?.has_pin
        ? { pin: nextForm.pin }
        : nextForm;
      const response = pinChallengeUser?.has_pin
        ? await api.verifyPin(payload)
        : await api.setupPin(payload);

      setPinChallengeUser(null);
      setPinForm({
        pin: "",
        pin_confirmation: "",
      });
      onPinCompleted(response.user);
    } catch (err) {
      if (err instanceof ApiError) {
        setPinErrors(err.errors ?? {});
        setBannerError(err.message);
        if (pinChallengeUser?.has_pin) {
          setPinForm({
            pin: "",
            pin_confirmation: "",
          });
        }
      } else {
        setBannerError("PIN gagal diproses. Silakan coba kembali.");
      }
    } finally {
      setSubmittingPin(false);
    }
  }

  function submitPin(event) {
    event.preventDefault();
    processPin();
  }

  function updatePinValue(field, value) {
    const nextForm = {
      ...pinForm,
      [field]: sanitizePin(value),
    };

    setPinForm(nextForm);
    processPin(nextForm);
  }

  async function cancelPinChallenge() {
    setPinChallengeUser(null);
    setPinForm({
      pin: "",
      pin_confirmation: "",
    });
    setPinErrors({});
    await onLogout();
  }

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 overflow-hidden selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Dynamic Ambient Background Grid */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40" />
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 h-[440px] w-[440px] rounded-full bg-emerald-500/10 blur-3xl animate-pulse duration-4000" />
        <div className="absolute bottom-12 right-1/4 h-[440px] w-[440px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 font-mono text-sm font-black text-emerald-400 shadow-sm border border-slate-800">
              S
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-900">
                SecureDocs
              </h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Document Security Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/50 px-3 py-1 text-xs font-medium text-emerald-700 backdrop-blur-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <ShieldCheck size={13} className="text-emerald-600" />
            <span className="font-mono text-[11px] uppercase tracking-wide">
              Node: SSL Secured
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center px-6 py-12">
        <div className="grid w-full gap-16 items-center lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left Panel */}
          <section className="hidden lg:flex lg:flex-col lg:justify-center">
            <div className="max-w-xl space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-xs">
                <span className="h-1 w-1 rounded-full bg-slate-400" />{" "}
                Enterprise Infrastructure
              </span>

              <h2 className="text-4xl font-extrabold tracking-tight text-slate-950 leading-[1.15] sm:text-5xl">
                Dekripsi instan, kontrol akses terpusat.
              </h2>

              <p className="text-sm leading-relaxed text-slate-600 max-w-lg">
                Masuk menggunakan akun korporat yang divalidasi untuk membuka
                berkas sensitif, melakukan audit log repositori, dan memantau
                riwayat integritas SHA-256 berkas Anda.
              </p>

              <div className="pt-4 grid gap-3 max-w-md">
                {[
                  "Algoritma Enkripsi Utama Berbasis AES-256 GCM",
                  "Proteksi Sesi Berlapis dengan Token Siklus Pendek",
                  "Audit Logging Real-Time Terikat pada Log Perangkat",
                ].map((text, idx) => (
                  <div
                    className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/60 p-3.5 backdrop-blur-xs shadow-xs"
                    key={idx}
                  >
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600">
                      <ShieldCheck size={14} />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Panel (Form Login Anti-Tabrakan) */}
          <section className="flex items-center justify-center lg:justify-end">
            <div className="w-full max-w-[400px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40 sm:p-9">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">
                    Otentikasi Pengguna
                  </h3>
                  <p className="mt-1 text-xs font-medium text-slate-400">
                    Masukkan alamat email resmi dan kata sandi Anda.
                  </p>
                </div>

                {/* Banner Error */}
                {bannerError && (
                  <div className="mt-5 flex gap-2.5 rounded-lg border border-red-100 bg-red-50/60 p-3 text-xs font-semibold text-red-800 animate-in fade-in duration-150">
                    <ShieldAlert
                      size={16}
                      className="shrink-0 text-red-600 mt-0.5"
                    />
                    <span>{bannerError}</span>
                  </div>
                )}

                {bannerSuccess && (
                  <div className="mt-5 flex gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50/70 p-3 text-xs font-semibold text-emerald-800 animate-in fade-in duration-150">
                    <ShieldCheck
                      size={16}
                      className="shrink-0 text-emerald-600 mt-0.5"
                    />
                    <span>{bannerSuccess}</span>
                  </div>
                )}

                <form
                  onSubmit={handleSubmit(submit)}
                  className="mt-6 space-y-4"
                >
                  {/* INPUT UNIT: EMAIL (Zero-Collision Structure) */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="email"
                      className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block"
                    >
                      Corporate Email
                    </label>
                    <div className="relative group">
                      {/* Ikon dipindah ke SISI KANAN agar tidak memotong awal teks/placeholder */}
                      <input
                        id="email"
                        type="email"
                        disabled={isSubmitting}
                        {...register("email")}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-10 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 disabled:opacity-50"
                        placeholder="username@company.com"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none border-l border-slate-200 pl-2.5 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors">
                        <Mail size={14} />
                      </div>
                    </div>
                    {errors.email && (
                      <p className="text-[10px] font-semibold text-red-600 animate-in fade-in">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* INPUT UNIT: PASSWORD (Zero-Collision Structure) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="password"
                        className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block"
                      >
                        Account Password
                      </label>
                      <button
                        type="button"
                        className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                        onClick={() => setShowForgotPasswordInfo(true)}
                      >
                        Lupa sandi?
                      </button>
                    </div>
                    <div className="relative group">
                      <input
                        id="password"
                        disabled={isSubmitting}
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-3 pr-10 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-300 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 disabled:opacity-50 tracking-wide"
                        placeholder="••••••••"
                      />
                      {/* Tombol Mata Interaktif Terisolasi Bergaris Batas */}
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isSubmitting}
                        className="absolute right-0 top-0 bottom-0 px-3 flex items-center justify-center text-slate-400 hover:text-slate-700 border-l border-slate-200 my-2 h-6 transition-colors"
                        title={
                          showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={14} />
                        ) : (
                          <Eye size={14} />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-[10px] font-semibold text-red-600 animate-in fade-in">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="h-10 w-full rounded-lg bg-slate-950 font-bold text-xs text-white uppercase tracking-wider transition-all hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40 shadow-sm mt-2"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Authenticating...
                      </span>
                    ) : (
                      "Sign In To Workspace"
                    )}
                  </Button>
                </form>
              </div>

              <p className="mt-5 text-center text-[10px] font-mono tracking-wider uppercase text-slate-400 lg:text-right">
                © 2026 SecureDocs System Inc. All rights reserved.
              </p>
            </div>
          </section>
        </div>
      </div>

      {passwordChangeUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  Ganti Password Pertama Kali
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Akun {passwordChangeUser.email} masih memakai password sementara dari admin.
                </p>
              </div>
            </div>

            <form className="grid gap-4" onSubmit={submitPasswordChange}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Password Sementara</span>
                <input
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, current_password: event.target.value })
                  }
                  required
                  type="password"
                  value={passwordForm.current_password}
                />
                {passwordErrors.current_password?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {passwordErrors.current_password[0]}
                  </p>
                )}
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span>Password Baru</span>
                <input
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) =>
                    setPasswordForm({ ...passwordForm, password: event.target.value })
                  }
                  required
                  type="password"
                  value={passwordForm.password}
                />
                {passwordErrors.password?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {passwordErrors.password[0]}
                  </p>
                )}
              </label>

              <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Syarat Password Baru
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {passwordChecks.map((rule) => (
                    <div
                      className={`flex items-center gap-2 text-xs font-semibold ${
                        rule.passed ? "text-emerald-700" : "text-slate-400"
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
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  onChange={(event) =>
                    setPasswordForm({
                      ...passwordForm,
                      password_confirmation: event.target.value,
                    })
                  }
                  required
                  type="password"
                  value={passwordForm.password_confirmation}
                />
                {passwordErrors.password_confirmation?.[0] && (
                  <p className="text-xs font-semibold text-red-600">
                    {passwordErrors.password_confirmation[0]}
                  </p>
                )}
                {passwordForm.password_confirmation ? (
                  <p
                    className={`inline-flex items-center gap-2 text-xs font-semibold ${
                      confirmationMatches ? "text-emerald-700" : "text-red-600"
                    }`}
                  >
                    {confirmationMatches ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    {confirmationMatches
                      ? "Konfirmasi password sudah sama."
                      : "Konfirmasi password belum sama."}
                  </p>
                ) : null}
              </label>

              <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  disabled={changingPassword}
                  onClick={cancelPasswordChange}
                  type="button"
                >
                  Logout
                </button>
                <button
                  className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  disabled={changingPassword}
                  type="submit"
                >
                  {changingPassword ? "Mengganti..." : "Simpan Password Baru"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {pinChallengeUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-52 w-52 rounded-full bg-cyan-300/30 blur-3xl" />

            <div className="relative mb-6 flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 shadow-lg shadow-slate-900/20">
                <LockKeyhole size={21} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-600">
                  Secure PIN Gate
                </p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                  {pinChallengeUser.has_pin ? "Masukkan PIN" : "Buat PIN Keamanan"}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {pinChallengeUser.has_pin
                    ? `Akun ${pinChallengeUser.email} memerlukan PIN sebelum dashboard dibuka.`
                    : `Akun ${pinChallengeUser.email} belum memiliki PIN. Buat PIN 6 angka terlebih dahulu.`}
                </p>
              </div>
            </div>

            <form className="relative grid gap-5" onSubmit={submitPin}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  {pinChallengeUser.has_pin ? "PIN" : "PIN Baru"}
                </span>
                <div className="relative">
                  <PinBoxes value={pinForm.pin} />
                  <input
                    autoFocus
                    className="absolute inset-0 h-full w-full cursor-text opacity-0"
                    disabled={submittingPin}
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) => updatePinValue("pin", event.target.value)}
                    required
                    type="password"
                    value={pinForm.pin}
                  />
                </div>
                {pinErrors.pin?.[0] && (
                  <p className="text-xs font-semibold text-red-600">{pinErrors.pin[0]}</p>
                )}
              </label>

              {!pinChallengeUser.has_pin && (
                <label className="grid gap-2 text-sm font-semibold text-slate-700">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Konfirmasi PIN
                  </span>
                  <div className="relative">
                    <PinBoxes value={pinForm.pin_confirmation} tone="cyan" />
                    <input
                      className="absolute inset-0 h-full w-full cursor-text opacity-0"
                      disabled={submittingPin}
                      inputMode="numeric"
                      maxLength={6}
                      onChange={(event) =>
                        updatePinValue("pin_confirmation", event.target.value)
                      }
                      required
                      type="password"
                      value={pinForm.pin_confirmation}
                    />
                  </div>
                  {pinErrors.pin_confirmation?.[0] && (
                    <p className="text-xs font-semibold text-red-600">
                      {pinErrors.pin_confirmation[0]}
                    </p>
                  )}
                  {pinForm.pin_confirmation ? (
                    <p
                      className={`inline-flex items-center gap-2 text-xs font-semibold ${
                        pinForm.pin === pinForm.pin_confirmation
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {pinForm.pin === pinForm.pin_confirmation ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Circle size={15} />
                      )}
                      {pinForm.pin === pinForm.pin_confirmation
                        ? "Konfirmasi PIN sudah sama."
                        : "Konfirmasi PIN belum sama."}
                    </p>
                  ) : null}
                </label>
              )}

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs leading-relaxed text-slate-500">
                {submittingPin ? (
                  <span className="inline-flex items-center gap-2 font-bold text-slate-700">
                    <Loader2 className="animate-spin text-emerald-600" size={15} />
                    Memproses PIN otomatis...
                  </span>
                ) : (
                  "Isi 6 angka, sistem akan otomatis membuka dashboard tanpa tombol. PIN tetap disimpan dalam bentuk hash."
                )}
              </div>

              <div className="mt-1 flex justify-center">
                <button
                  className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60"
                  disabled={submittingPin}
                  onClick={cancelPinChallenge}
                  type="button"
                >
                  Logout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForgotPasswordInfo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 animate-in zoom-in-95 duration-150">
            <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-300/30 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <KeyRound size={21} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-600">
                  Bantuan Akses
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
                  Lupa password?
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Demi keamanan dokumen perusahaan, reset password hanya dapat dilakukan oleh admin atau tim IT kantor.
                </p>
              </div>
            </div>

            <div className="relative mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-relaxed text-emerald-900">
              Silakan hubungi tim IT kantor untuk dibuatkan password sementara. Setelah itu Anda akan diminta mengganti password sendiri saat login.
            </div>

            <div className="relative mt-6 flex justify-end">
              <button
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => setShowForgotPasswordInfo(false)}
                type="button"
              >
                Saya mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
