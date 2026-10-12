"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

export default function RegisterPage() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg(t("auth.errors.emailRequired"));
      return;
    }
    if (!cleanEmail.includes("@")) {
      setErrorMsg(t("auth.errors.emailInvalid"));
      return;
    }
    if (!password) {
      setErrorMsg(t("auth.errors.passwordRequired"));
      return;
    }
    if (password.length < 6) {
      setErrorMsg(t("auth.errors.passwordShort"));
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg(t("auth.errors.passwordMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await getSupabase().auth.signUp({
        email: cleanEmail,
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("user already exists")) {
          setErrorMsg(t("auth.errors.emailTaken"));
        } else if (msg.includes("password")) {
          setErrorMsg(t("auth.errors.passwordShort"));
        } else {
          setErrorMsg(t("auth.errors.generic"));
        }
        setLoading(false);
      } else if (data.session) {
        router.replace("/dashboard");
      } else {
        setSuccessMsg(t("auth.checkEmail"));
        setLoading(false);
      }
    } catch {
      setErrorMsg(t("auth.errors.network"));
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[72vh] max-w-md flex-col justify-center py-8 animate-apple-in">
      <div className="card p-7 sm:p-9 border-black/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-700 shadow-sm mb-4">
            <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            {t("auth.registerTitle")}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted">
            {t("auth.registerSubtitle")}
          </p>
        </div>

        {errorMsg && (
          <div className="alert-error mt-5" role="alert">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="alert-success mt-5" role="status">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="register-email" className="field-label">
              {t("auth.email")}
            </label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className="field-label">
              {t("auth.password")}
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input font-medium"
              placeholder="••••••••"
              disabled={loading}
            />
            <p className="field-hint">{t("auth.passwordHint")}</p>
          </div>

          <div>
            <label htmlFor="register-confirm" className="field-label">
              {t("auth.confirmPassword")}
            </label>
            <input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? t("auth.registering") : t("auth.registerButton")}
            </button>
          </div>
        </form>

        <div className="mt-6 border-t border-black/[0.05] pt-5 text-center text-sm text-muted">
          <span>{t("auth.haveAccount")} </span>
          <Link
            href="/login"
            className="font-bold text-brand-700 hover:text-brand-800 underline underline-offset-4"
          >
            {t("auth.goLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
