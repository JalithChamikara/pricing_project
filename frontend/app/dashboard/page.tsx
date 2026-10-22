"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  listProperties,
  saveRecommendations,
  type Property,
} from "@/lib/db";
import {
  getRecommendations,
  apiErrorKey,
  type Recommendation,
  type RecommendInfo,
} from "@/lib/api";
import {
  formatDate,
  formatLKR,
  formatPercent,
  toISODate,
  addDays,
  daysInclusive,
} from "@/lib/format";
import PropertyModal from "@/components/PropertyModal";
import WhyPriceModal from "@/components/WhyPriceModal";
import OccupancyChart from "@/components/OccupancyChart";
import PriceComparisonChart from "@/components/PriceComparisonChart";

export default function DashboardPage() {
  const { lang, t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Properties state
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [propLoading, setPropLoading] = useState(true);
  const [propertyModalOpen, setPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form inputs (default: tomorrow + 7 days set on client)
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [arrivalsPct, setArrivalsPct] = useState<number>(0);
  const [demandSurge, setDemandSurge] = useState<boolean>(false);
  const [competitorPriceInput, setCompetitorPriceInput] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only date defaults
    setStartDate(toISODate(addDays(new Date(), 1)));
    setEndDate(toISODate(addDays(new Date(), 7)));
  }, []);

  // Recommendations state
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [recommendInfo, setRecommendInfo] = useState<RecommendInfo | null>(null);
  const [activeWhyRec, setActiveWhyRec] = useState<Recommendation | null>(null);

  // Save state
  const [savingRecs, setSavingRecs] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const loadProps = async () => {
    if (!user) return;
    try {
      setPropLoading(true);
      const data = await listProperties();
      setProperties(data);
      if (data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
    } catch {
      // Supabase error
    } finally {
      setPropLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadProps();
    }
  }, [user]);

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? properties[0];

  const handleGetRecommendations = async (e: FormEvent) => {
    e.preventDefault();
    setRecsError(null);
    setSavedSuccess(false);
    setSaveErrorMsg(null);

    if (!selectedProperty) {
      setPropertyModalOpen(true);
      return;
    }

    if (!startDate) {
      setRecsError(t("dashboard.errors.startRequired"));
      return;
    }
    if (!endDate) {
      setRecsError(t("dashboard.errors.endRequired"));
      return;
    }
    if (endDate < startDate) {
      setRecsError(t("dashboard.errors.endBeforeStart"));
      return;
    }
    const daysCount = daysInclusive(startDate, endDate);
    if (daysCount > 60) {
      setRecsError(t("dashboard.errors.tooManyDays"));
      return;
    }

    let parsedComp: number | undefined = undefined;
    if (competitorPriceInput.trim()) {
      const val = Number(competitorPriceInput.trim());
      if (isNaN(val) || val <= 0) {
        setRecsError(t("dashboard.errors.competitorInvalid"));
        return;
      }
      parsedComp = val;
    }

    setRecsLoading(true);
    try {
      const res = await getRecommendations({
        district: selectedProperty.district,
        property_type: selectedProperty.property_type,
        base_rate: selectedProperty.base_rate,
        start_date: startDate,
        end_date: endDate,
        arrivals_change_pct: arrivalsPct,
        demand_surge: demandSurge,
        competitor_price: parsedComp,
      });

      setRecommendations(res.recommendations);
      setRecommendInfo(res.info);
    } catch (err) {
      const translationKey = apiErrorKey(err);
      setRecsError(t(translationKey));
    } finally {
      setRecsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedProperty || !recommendations || recommendations.length === 0) return;
    setSavingRecs(true);
    setSaveErrorMsg(null);
    try {
      await saveRecommendations(selectedProperty.id, recommendations);
      setSavedSuccess(true);
    } catch {
      setSaveErrorMsg(t("results.saveError"));
    } finally {
      setSavingRecs(false);
    }
  };

  // Metrics
  const avgPrice = recommendations && recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + r.recommended_price, 0) / recommendations.length
    : 0;

  const avgOccupancy = recommendations && recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + r.predicted_occupancy, 0) / recommendations.length
    : 0;

  const bestDayRec = recommendations && recommendations.length > 0
    ? [...recommendations].sort((a, b) => b.recommended_price - a.recommended_price)[0]
    : null;

  return (
    <div className="space-y-7 animate-apple-in">
      {/* Property Selector / Hero Widget */}
      <section className="card relative overflow-hidden border-black/[0.06] bg-gradient-to-b from-white to-neutral-50/50">
        {propLoading ? (
          <div className="py-6 text-center text-sm font-medium text-muted">{t("common.loading")}</div>
        ) : properties.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-700 shadow-sm">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-ink">{t("property.addTitle")}</h2>
            <p className="mt-1.5 text-sm font-medium text-muted max-w-md mx-auto">{t("property.addSubtitle")}</p>
            <button
              type="button"
              onClick={() => {
                setEditingProperty(null);
                setPropertyModalOpen(true);
              }}
              className="btn-primary mt-6"
            >
              + {t("property.saveButton")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <label htmlFor="select-property" className="field-label text-xs uppercase tracking-wider text-muted">
                {t("property.yourPlace")}
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <select
                    id="select-property"
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    className="input h-12 min-h-12 max-w-xs appearance-none pr-10 font-bold text-ink bg-white shadow-sm"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({t(`options.districts.${p.district}`) || p.district})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {selectedProperty && (
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-black/[0.05] px-3 py-1 text-ink">
                      {t(`options.propertyTypes.${selectedProperty.property_type}`) || selectedProperty.property_type}
                    </span>
                    {selectedProperty.rooms && (
                      <span className="rounded-full bg-black/[0.05] px-3 py-1 text-ink">
                        {t("common.rooms", { count: selectedProperty.rooms })}
                      </span>
                    )}
                    {selectedProperty.amenities && selectedProperty.amenities.length > 0 && (
                      <span
                        className="rounded-full bg-brand-500/10 px-3 py-1 text-brand-800 border border-brand-500/20"
                        title={selectedProperty.amenities.join(", ")}
                      >
                        ✓ {t("property.amenitiesCount", { count: selectedProperty.amenities.length })}
                      </span>
                    )}
                    <span className="rounded-full bg-brand-500/10 px-3 py-1 text-brand-800 border border-brand-500/20">
                      {t("property.usualPrice")}: {formatLKR(selectedProperty.base_rate)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => {
                  setEditingProperty(selectedProperty);
                  setPropertyModalOpen(true);
                }}
                className="btn-secondary h-11 min-h-[44px] text-sm px-4 rounded-xl"
              >
                {t("common.edit")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingProperty(null);
                  setPropertyModalOpen(true);
                }}
                className="btn-ghost h-11 min-h-[44px] text-sm px-4"
              >
                + {t("property.addAnother")}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* "How It Works" Card (Apple HIG 3-step feature strip) */}
      <section className="rounded-[28px] border border-brand-500/20 bg-gradient-to-br from-brand-500/[0.08] via-emerald-50/60 to-white p-5 sm:p-7 shadow-[0_2px_12px_rgba(5,150,105,0.04)]">
        <h2 className="text-lg font-black tracking-tight text-brand-950 sm:text-xl">
          {t("howItWorks.title")}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-3.5 rounded-2xl bg-white/70 p-3.5 backdrop-blur-sm border border-white/60 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-[0_2px_8px_rgba(5,150,105,0.3)]">
              1
            </span>
            <span className="font-bold text-[15px] text-ink pt-1.5 leading-snug">
              {t("howItWorks.step1")}
            </span>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl bg-white/70 p-3.5 backdrop-blur-sm border border-white/60 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-[0_2px_8px_rgba(5,150,105,0.3)]">
              2
            </span>
            <span className="font-bold text-[15px] text-ink pt-1.5 leading-snug">
              {t("howItWorks.step2")}
            </span>
          </div>

          <div className="flex items-start gap-3.5 rounded-2xl bg-white/70 p-3.5 backdrop-blur-sm border border-white/60 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-[0_2px_8px_rgba(5,150,105,0.3)]">
              3
            </span>
            <span className="font-bold text-[15px] text-ink pt-1.5 leading-snug">
              {t("howItWorks.step3")}
            </span>
          </div>
        </div>
      </section>

      {/* Date & Strategy Form Card */}
      <section className="card">
        <h2 className="text-2xl font-black tracking-tight text-ink">
          {t("dashboard.formTitle")}
        </h2>

        {recsError && (
          <div className="alert-error mt-4" role="alert">
            {recsError}
          </div>
        )}

        <form onSubmit={handleGetRecommendations} className="mt-6 space-y-6">
          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start-date" className="field-label">
                {t("dashboard.startDate")}
              </label>
              <input
                id="start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input font-semibold"
                disabled={recsLoading}
              />
            </div>
            <div>
              <label htmlFor="end-date" className="field-label">
                {t("dashboard.endDate")}
              </label>
              <input
                id="end-date"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input font-semibold"
                disabled={recsLoading}
              />
            </div>
          </div>
          <p className="field-hint -mt-3.5">{t("dashboard.dateHint")}</p>

          {/* Apple-style Tourist Slider */}
          <div className="rounded-3xl border border-black/[0.06] bg-neutral-50/70 p-5">
            <div className="flex items-center justify-between">
              <label htmlFor="arrivals-slider" className="field-label mb-0 text-base">
                {t("dashboard.arrivalsLabel")}
              </label>
              <span
                className={`inline-flex items-center rounded-full px-3 py-0.5 text-sm font-extrabold transition-colors ${
                  arrivalsPct > 0
                    ? "bg-brand-500/15 text-brand-800"
                    : arrivalsPct < 0
                    ? "bg-rose-500/15 text-rose-700"
                    : "bg-black/[0.06] text-muted"
                }`}
              >
                {arrivalsPct > 0 ? `+${arrivalsPct}%` : `${arrivalsPct}%`}
              </span>
            </div>
            <p className="field-hint mt-1">{t("dashboard.arrivalsHelp")}</p>
            <input
              id="arrivals-slider"
              type="range"
              min="-30"
              max="30"
              step="5"
              value={arrivalsPct}
              onChange={(e) => setArrivalsPct(Number(e.target.value))}
              className="slider mt-4"
              disabled={recsLoading}
            />
            <div className="flex justify-between text-xs font-semibold text-muted px-1 mt-1">
              <span>{t("dashboard.arrivalsFewer")} (-30%)</span>
              <span>{t("dashboard.arrivalsNormal")} (0%)</span>
              <span>{t("dashboard.arrivalsMore")} (+30%)</span>
            </div>
          </div>

          {/* Apple iOS-style Toggle Card: Demand Surge */}
          <div className="rounded-3xl border border-black/[0.06] bg-neutral-50/70 p-5 transition-colors hover:bg-neutral-50">
            <label className="flex items-start gap-3.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={demandSurge}
                onChange={(e) => setDemandSurge(e.target.checked)}
                className="mt-0.5 h-6 w-6 rounded-lg border-neutral-300 text-brand-600 focus:ring-brand-500/20"
                disabled={recsLoading}
              />
              <div>
                <span className="block text-[16px] font-bold tracking-tight text-ink">
                  {t("dashboard.surgeLabel")}
                </span>
                <span className="field-hint block mt-0.5">
                  {t("dashboard.surgeHelp")}
                </span>
              </div>
            </label>
          </div>

          {/* Optional: Competitor Price */}
          <div>
            <label htmlFor="competitor-price" className="field-label">
              {t("dashboard.competitorLabel")}{" "}
              <span className="text-xs font-normal text-muted">{t("dashboard.optional")}</span>
            </label>
            <input
              id="competitor-price"
              type="number"
              min="0"
              step="50"
              value={competitorPriceInput}
              onChange={(e) => setCompetitorPriceInput(e.target.value)}
              placeholder="e.g. 14000"
              className="input max-w-sm font-semibold"
              disabled={recsLoading}
            />
            <p className="field-hint">{t("dashboard.competitorHelp")}</p>
          </div>

          {/* Primary Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={recsLoading || !selectedProperty}
              className="btn-primary w-full sm:w-auto sm:min-w-72"
            >
              {recsLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {t("dashboard.submitting")}
                </span>
              ) : (
                t("dashboard.submit")
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Results Section */}
      {recommendations && recommendations.length > 0 && (
        <section className="space-y-6 animate-apple-in">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-ink">
                {t("results.title")}
              </h2>
              {recommendInfo && (
                <p className="mt-1 text-xs sm:text-sm font-medium text-muted">
                  {recommendInfo.competitor_source === "entered by the owner"
                    ? t("results.competitorFromOwner")
                    : t("results.competitorFromMarket", { count: recommendInfo.scraped_hotels_used })}
                </p>
              )}
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-3">
              {savedSuccess ? (
                <div className="flex items-center gap-2 rounded-2xl bg-brand-500/10 border border-brand-500/20 px-5 py-3 text-sm font-bold text-brand-800">
                  <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("results.saved")}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={savingRecs}
                  className="btn-secondary w-full sm:w-auto"
                >
                  {savingRecs ? t("results.saving") : t("results.saveButton")}
                </button>
              )}
            </div>
          </div>

          {saveErrorMsg && (
            <div className="alert-error" role="alert">
              {saveErrorMsg}
            </div>
          )}

          {/* 3 Apple Fitness / Health Style Metric Widgets */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="card border-brand-500/20 bg-gradient-to-br from-brand-500/[0.07] to-white p-6 shadow-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-800">
                {t("results.avgPrice")}
              </span>
              <span className="mt-2 block text-3xl sm:text-4xl font-black tracking-tight text-ink">
                {formatLKR(avgPrice)}
              </span>
              <span className="mt-1 block text-xs font-medium text-muted">
                {t("results.perNight")}
              </span>
            </div>

            <div className="card border-brand-500/20 bg-gradient-to-br from-brand-500/[0.07] to-white p-6 shadow-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-800">
                {t("results.avgOccupancy")}
              </span>
              <span className="mt-2 block text-3xl sm:text-4xl font-black tracking-tight text-ink">
                {formatPercent(avgOccupancy)}
              </span>
              <span className="mt-1 block text-xs font-medium text-muted">
                {t("results.roomsFilled")}
              </span>
            </div>

            <div className="card border-brand-500/20 bg-gradient-to-br from-brand-500/[0.07] to-white p-6 shadow-sm">
              <span className="block text-xs font-bold uppercase tracking-wider text-brand-800">
                {t("results.bestDay")}
              </span>
              <span className="mt-2 block text-2xl sm:text-3xl font-black tracking-tight text-brand-700">
                {bestDayRec ? formatDate(bestDayRec.date, lang) : "—"}
              </span>
              <span className="mt-1 block text-xs font-bold text-ink">
                {bestDayRec ? formatLKR(bestDayRec.recommended_price) : ""}
              </span>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <h3 className="text-base font-bold tracking-tight text-ink mb-4">
                {t("results.occupancyChart")}
              </h3>
              <OccupancyChart data={recommendations} />
            </div>

            <div className="card">
              <h3 className="text-base font-bold tracking-tight text-ink mb-4">
                {t("results.priceChart")}
              </h3>
              <PriceComparisonChart data={recommendations} />
            </div>
          </div>

          {/* Day-by-Day Cards */}
          <div className="card">
            <h3 className="text-xl font-black tracking-tight text-ink mb-4">
              {t("results.dayByDay")}
            </h3>

            <div className="space-y-3">
              {recommendations.map((r) => {
                const isHigher = r.price_vs_usual === "higher";
                const isLower = r.price_vs_usual === "lower";

                return (
                  <div
                    key={r.date}
                    className="flex flex-col gap-3 rounded-2xl border border-black/[0.05] bg-neutral-50/70 p-4 transition-all duration-150 sm:flex-row sm:items-center sm:justify-between hover:bg-neutral-50 hover:border-black/[0.1] hover:shadow-sm"
                  >
                    {/* Date and Indicator Badges */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[17px] font-black text-ink">
                          {formatDate(r.date, lang)}
                        </span>
                        {isHigher && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            ↑ {t("results.higher")}
                          </span>
                        )}
                        {isLower && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-800">
                            ↓ {t("results.lower")}
                          </span>
                        )}
                        {!isHigher && !isLower && (
                          <span className="rounded-full bg-black/[0.06] px-2.5 py-0.5 text-xs font-bold text-neutral-600">
                            = {t("results.same")}
                          </span>
                        )}
                      </div>

                      {/* iOS Style Pill Occupancy Gauge */}
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <div className="h-2 w-32 rounded-full bg-neutral-200 overflow-hidden">
                          <div
                            className="h-full bg-brand-600 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, r.predicted_occupancy))}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-muted">
                          {Math.round(r.predicted_occupancy)}% {t("results.occupancy").toLowerCase()}
                        </span>
                      </div>
                    </div>

                    {/* Price Figures & "Why this price?" */}
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <span className="block text-2xl font-black tracking-tight text-brand-900">
                          {formatLKR(r.recommended_price)}
                        </span>
                        <span className="block text-[11px] font-medium text-muted">
                          {t("why.usual")}: {formatLKR(r.usual_price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveWhyRec(r)}
                        className="btn-secondary h-11 min-h-[44px] text-xs sm:text-sm px-4 rounded-xl whitespace-nowrap"
                      >
                        {t("results.whyButton")}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prototype Disclaimer Footnote */}
          <p className="text-center text-xs font-medium text-muted">
            {t("dashboard.disclaimer")}
          </p>
        </section>
      )}

      {/* Property Modal */}
      <PropertyModal
        property={editingProperty}
        isOpen={propertyModalOpen}
        onClose={() => {
          setPropertyModalOpen(false);
          setEditingProperty(null);
        }}
        onSaved={(prop) => {
          loadProps();
          setSelectedPropertyId(prop.id);
        }}
      />

      {/* Why This Price Modal */}
      <WhyPriceModal
        rec={activeWhyRec}
        info={recommendInfo}
        onClose={() => setActiveWhyRec(null)}
      />
    </div>
  );
}
