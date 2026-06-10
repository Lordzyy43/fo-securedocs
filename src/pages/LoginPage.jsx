import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  Mail,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../components/ui/Button.jsx";
import { ApiError } from "../services/api.js";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi.")
    .email("Format email tidak valid."),
  password: z.string().min(1, "Password wajib diisi."),
  remember: z.boolean(),
});

export function LoginPage({ onLogin }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function submit(values) {
    setError("");
    try {
      await onLogin(values);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Autentikasi gagal. Silakan coba kembali.",
      );
    }
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
                {error && (
                  <div className="mt-5 flex gap-2.5 rounded-lg border border-red-100 bg-red-50/60 p-3 text-xs font-semibold text-red-800 animate-in fade-in duration-150">
                    <ShieldAlert
                      size={16}
                      className="shrink-0 text-red-600 mt-0.5"
                    />
                    <span>{error}</span>
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

                  {/* Checkbox Ingat Sesi */}
                  <div className="flex items-center pt-0.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      <input
                        disabled={isSubmitting}
                        type="checkbox"
                        {...register("remember")}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-slate-950 accent-slate-950 focus:ring-0"
                      />
                      Ingat sesi perangkat ini
                    </label>
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
    </main>
  );
}
