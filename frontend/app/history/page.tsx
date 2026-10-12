"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  listProperties,
  listSavedRecommendations,
  type Property,
  type SavedRecommendation,
} from "@/lib/db";
import { formatDate, formatLongDate, formatLKR, formatPercent } from "@/lib/format";

export default function HistoryPage() {
  const { lang, t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [items, setItems] = useState<SavedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      listProperties()
        .then((props) => setProperties(props))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    listSavedRecommendations(selectedPropertyId || undefined)
      .then((data) => setItems(data))
      .catch(() => setErrorMsg(t("common.dbError")))
      .finally(() => setLoading(false));
  }, [user, selectedPropertyId, t]);

  return (
    <div className="space-y-6 animate-apple-in">
      {/* Header and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">
            {t("history.title")}
          </h1>
        </div>

        {properties.length > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="history-filter" className="text-xs font-bold uppercase tracking-wider text-muted whitespace-nowrap">
              {t("history.filterLabel")}:
            </label>
            <div className="relative">
              <select
                id="history-filter"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="input h-11 min-h-[44px] appearance-none pr-9 py-2 text-sm font-semibold max-w-xs bg-white shadow-sm"
              >
                <option value="">{t("history.allPlaces")}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="alert-error" role="alert">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="card py-16 text-center text-sm font-medium text-muted">
          {t("common.loading")}
        </div>
      ) : items.length === 0 ? (
        /* Empty State */
        <div className="card py-16 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-black/[0.04] text-muted">
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-4 text-base font-semibold text-muted max-w-md mx-auto">
            {t("history.empty")}
          </p>
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
            {t("history.goDashboard")}
          </Link>
        </div>
      ) : (
        /* Cards / Table List */
        <div className="space-y-3">
          {items.map((row) => (
            <div
              key={row.id}
              className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:border-black/[0.12] hover:shadow-md transition-all duration-150"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-black text-ink">
                    {formatDate(row.stay_date, lang)}
                  </span>
                  {row.properties?.name && (
                    <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 text-xs font-semibold text-muted">
                      {row.properties.name}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs font-medium text-muted">
                  <span>
                    {t("history.savedOn")}: {formatLongDate(row.created_at, lang)}
                  </span>
                  {row.predicted_occupancy !== null && (
                    <span>
                      • {t("history.occupancy")}: {formatPercent(row.predicted_occupancy)}
                    </span>
                  )}
                  {row.competitor_price !== null && (
                    <span>
                      • {t("history.competitor")}: {formatLKR(row.competitor_price)}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="block text-2xl font-black tracking-tight text-brand-900">
                  {formatLKR(row.recommended_price)}
                </span>
                <span className="block text-[11px] font-semibold text-muted uppercase tracking-wider">
                  {t("history.suggested")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
