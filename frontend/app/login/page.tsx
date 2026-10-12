"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg(t("auth.errors.emailRequired"));
      return;
    }
    if (!password) {
      setErrorMsg(t("auth.errors.passwordRequired"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
          setErrorMsg(t("auth.errors.invalidCredentials"));
        } else if (msg.includes("email not confirmed")) {
          setErrorMsg(t("auth.errors.emailNotConfirmed"));
        } else if (msg.includes("too many requests") || msg.includes("rate limit")) {
          setErrorMsg(t("auth.errors.tooManyRequests"));
        } else {
          setErrorMsg(t("auth.errors.generic"));
        }
        setLoading(false);
      } else {
        router.replace("/dashboard");
      }
    } catch {
      setErrorMsg(t("auth.errors.network"));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center py-8 animate-apple-in">
      <div className="card p-7 sm:p-9 border-black/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        {/* Apple Logo Glyph & Heading */}
        <div className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-700 shadow-sm mb-4">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            {t("auth.loginTitle")}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {errorMsg && (
          <div className="alert-error mt-5" role="alert">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="field-label">
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input font-medium"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="password" className="field-label">
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input font-medium"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full shadow-[0_4px_16px_rgba(5,150,105,0.35)]"
            >
              {loading ? t("auth.loggingIn") : t("auth.loginButton")}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-black/[0.05] pt-5 text-center text-sm text-muted">
          <span>{t("auth.noAccount")} </span>
          <Link
            href="/register"
            className="font-bold text-brand-700 hover:text-brand-800 underline underline-offset-4"
          >
            {t("auth.goRegister")}
          </Link>
        </div>
      </div>
    </div>
  );
}
