"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "./en.json";
import si from "./si.json";
import ta from "./ta.json";

export type Lang = "en" | "si" | "ta";
export const LANGS: Lang[] = ["en", "si", "ta"];
/** Language names are always shown in their own script. */
export const LANG_LABELS: Record<Lang, string> = { en: "English", si: "සිංහල", ta: "தமிழ்" };

type Dict = Record<string, unknown>;
const DICTIONARIES: Record<Lang, Dict> = { en, si, ta };
const STORAGE_KEY = "lang";

type Vars = Record<string, string | number>;

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a dot-path key, e.g. t("dashboard.submit"). Falls back to English, then the key. */
  t: (key: string, vars?: Vars) => string;
  /** True if the key exists in the current language (no English fallback). */
  has: (key: string) => boolean;
}

const I18nContext = createContext<I18nValue | null>(null);

function lookup(dict: Dict, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split(".")) {
    if (node && typeof node === "object" && part in (node as Dict)) node = (node as Dict)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

function fill(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Load saved language once on the client.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only available after mount
    if (saved && (LANGS as string[]).includes(saved)) setLangState(saved as Lang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) =>
      fill(lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES.en, key) ?? key, vars),
    [lang],
  );

  const has = useCallback((key: string) => lookup(DICTIONARIES[lang], key) !== undefined, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, has }), [lang, setLang, t, has]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
