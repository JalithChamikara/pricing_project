"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useI18n, LANGS, LANG_LABELS, type Lang } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/lib/auth";

export default function Header() {
  const { lang, setLang, t } = useI18n();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: t("header.dashboard") },
    { href: "/history", label: t("header.history") },
    { href: "/feedback", label: t("header.feedback") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-black/[0.05] bg-white/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand App Icon & Name */}
        <Link
          href={user ? "/dashboard" : "/login"}
          className="group flex items-center gap-3 focus:outline-none"
        >
          {/* Apple-style squircle app icon */}
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-[0_3px_10px_rgba(5,150,105,0.28)] transition-transform duration-200 group-hover:scale-105 active:scale-95">
            <svg
              className="h-6 w-6 transition-transform group-hover:rotate-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
          </div>

          <div>
            <span className="block text-lg font-bold tracking-tight text-ink sm:text-xl">
              {t("common.appName")}
            </span>
            <span className="block text-[11px] font-medium text-muted -mt-0.5">
              {t("common.appTagline")}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Tabs */}
        {user && (
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative rounded-xl px-4 py-2 text-[15px] font-semibold tracking-tight transition-all duration-150 ${
                    active
                      ? "bg-black/[0.05] text-brand-700 font-bold"
                      : "text-muted hover:bg-black/[0.03] hover:text-ink"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-brand-600" />
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right side: Apple Segmented Language Switcher + User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* iOS Segmented Pill Control for Languages */}
          <div className="inline-flex items-center rounded-full bg-black/[0.04] p-1 border border-black/[0.04]">
            {LANGS.map((code) => {
              const selected = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code as Lang)}
                  aria-pressed={selected}
                  className={`rounded-full px-2.5 py-1 text-xs sm:text-[13px] font-semibold transition-all duration-200 select-none ${
                    selected
                      ? "bg-white text-ink shadow-[0_2px_6px_rgba(0,0,0,0.08)] scale-[1.02]"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {LANG_LABELS[code]}
                </button>
              );
            })}
          </div>

          {/* Desktop Log Out Button */}
          {user && (
            <button
              type="button"
              onClick={() => signOut()}
              className="hidden rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs font-semibold text-muted shadow-sm transition-all hover:bg-neutral-50 hover:text-ink active:scale-95 md:inline-flex"
            >
              {t("header.logout")}
            </button>
          )}

          {/* Mobile Menu Toggle */}
          {user && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-black/[0.04] text-ink transition-transform active:scale-95 md:hidden"
              aria-label={t("header.mainMenu")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {user && mobileMenuOpen && (
        <div className="border-t border-black/[0.05] bg-white/95 px-4 py-3 backdrop-blur-xl md:hidden animate-apple-in">
          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-[17px] font-semibold transition-colors ${
                    active ? "bg-brand-50 text-brand-700 font-bold" : "text-ink hover:bg-black/[0.02]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="mt-2 text-left rounded-2xl border border-red-200/80 bg-red-50/50 px-4 py-3 text-[17px] font-semibold text-rose-700 active:scale-98"
            >
              {t("header.logout")}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
