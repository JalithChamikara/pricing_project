"use client";

import { useEffect, useRef, useState } from "react";
import type { Recommendation, RecommendInfo, PriceBreakdown } from "@/lib/api";
import { formatLKR, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface WhyPriceModalProps {
  rec: Recommendation | null;
  info?: RecommendInfo | null;
  onClose: () => void;
}

function formatFactorValue(
  factor: string,
  val: number | string | boolean | null | undefined,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  if (val === null || val === undefined) return "";

  if (
    factor === "tourist_arrivals" ||
    factor === "arrivals_last_week" ||
    factor === "arrivals_trend"
  ) {
    const num = typeof val === "number" ? Math.round(val) : Math.round(Number(val));
    return t("why.units.touristsPerDay", { count: num.toLocaleString("en-US") });
  }

  if (factor === "booking_lead_time") {
    const num = typeof val === "number" ? Math.round(val) : Math.round(Number(val));
    return t("why.units.days", { count: num.toLocaleString("en-US") });
  }

  if (factor === "occupancy_last_week") {
    const num = typeof val === "number" ? Math.round(val) : Math.round(Number(val));
    return t("why.units.percent", { count: num });
  }

  if (factor === "season") {
    const sKey = String(val).toLowerCase();
    return t(`why.seasons.${sKey}`);
  }

  if (factor === "day_of_week") {
    const dayIndex = Number(val);
    return t(`why.weekdays.${dayIndex}`);
  }

  if (factor === "month") {
    const monthNum = Number(val);
    return t(`why.months.${monthNum}`);
  }

  if (factor === "weekend") {
    return Boolean(val)
      ? t("why.booleans.weekendTrue")
      : t("why.booleans.weekendFalse");
  }

  if (factor === "demand_surge") {
    return Boolean(val)
      ? t("why.booleans.surgeTrue")
      : t("why.booleans.surgeFalse");
  }

  if (typeof val === "boolean") {
    return val ? t("why.booleans.true") : t("why.booleans.false");
  }

  if (typeof val === "number") {
    return Math.round(val).toLocaleString("en-US");
  }

  return String(val);
}

export default function WhyPriceModal({ rec, info, onClose }: WhyPriceModalProps) {
  const { lang, t, has } = useI18n();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [showAllReasons, setShowAllReasons] = useState(false);
  const [showWeightsTooltip, setShowWeightsTooltip] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    if (!rec) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rec, onClose]);

  // Reset local state when a new recommendation is opened
  useEffect(() => {
    setShowAllReasons(false);
    setShowWeightsTooltip(false);
  }, [rec?.date]);

  if (!rec) return null;

  // Synthesize or use breakdown
  const breakdown: PriceBreakdown = rec.breakdown ?? {
    usual_price: rec.usual_price,
    typical_occupancy: 50,
    predicted_occupancy: rec.predicted_occupancy,
    normal_occupancy: 50,
    weight_demand: 0.6,
    weight_market: 0.4,
    typical_day_effect_lkr: 0,
    demand_effect_lkr: Math.round(0.6 * (rec.recommended_price - rec.usual_price)),
    market_effect_lkr: Math.round(0.4 * (rec.competitor_price - rec.usual_price)),
    limit_effect_lkr: 0,
    rounding_effect_lkr: 0,
    competitor_price: rec.competitor_price,
    min_price: Math.round(rec.usual_price * 0.7),
    max_price: Math.round(rec.usual_price * 1.6),
    was_limited: false,
    final_price: rec.recommended_price,
  };

  // Section 1 calculations: difference from usual price
  const diffLkr = rec.recommended_price - rec.usual_price;
  const diffPct = rec.usual_price > 0 ? (diffLkr / rec.usual_price) * 100 : 0;
  const isHigher = diffLkr > 0;
  const isLower = diffLkr < 0;

  // Section 2: Expected rooms filled sentence
  let roomsSentence = "";
  if (breakdown.predicted_occupancy > breakdown.typical_occupancy) {
    roomsSentence = t("why.roomsFilledSentenceMore", {
      thisDay: breakdown.predicted_occupancy.toFixed(1),
      typical: breakdown.typical_occupancy.toFixed(1),
    });
  } else if (breakdown.predicted_occupancy < breakdown.typical_occupancy) {
    roomsSentence = t("why.roomsFilledSentenceFewer", {
      thisDay: breakdown.predicted_occupancy.toFixed(1),
      typical: breakdown.typical_occupancy.toFixed(1),
    });
  } else {
    roomsSentence = t("why.roomsFilledSentenceSame", {
      thisDay: breakdown.predicted_occupancy.toFixed(1),
    });
  }

  // Section 4: Main reasons calculations
  const allReasons = rec.reasons || [];
  const maxOccupancyPoints = Math.max(
    ...allReasons.map((r) => Math.abs(r.occupancy_points ?? 0)),
    1
  );
  const displayedReasons = showAllReasons ? allReasons : allReasons.slice(0, 3);

  // Section 5: Competitor source mapping
  const compPrice = breakdown.competitor_price || rec.competitor_price;
  const isOwnerCompetitor = info?.competitor_source === "entered by the owner";
  const sourceText = isOwnerCompetitor
    ? t("why.sourceEntered")
    : t("why.sourceScraped");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4 transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full sm:max-w-xl max-h-[92vh] flex flex-col rounded-t-[32px] sm:rounded-[32px] border border-black/[0.08] bg-white/95 shadow-[0_24px_64px_rgba(0,0,0,0.22)] backdrop-blur-2xl animate-apple-in"
      >
        {/* iOS Drag Handle Pill (Mobile affordance) */}
        <div className="pt-3 pb-1 sm:hidden">
          <div className="mx-auto h-1 w-10 rounded-full bg-neutral-300" />
        </div>

        {/* Modal Header Bar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-black/[0.06]">
          <div>
            <h2 id="why-modal-title" className="text-xl sm:text-2xl font-black tracking-tight text-ink">
              {t("why.title")}
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-brand-700">
              {formatDate(rec.date, lang)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.05] text-muted transition-transform hover:bg-black/[0.08] hover:text-ink active:scale-90"
            aria-label={t("common.close")}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* SECTION 1: HEADER SUMMARY CARD */}
          <section className="rounded-2xl border border-brand-200/80 bg-gradient-to-br from-brand-50/90 to-brand-100/40 p-5 shadow-sm">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-brand-800">
              {t("why.suggested")}
            </span>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-black tracking-tight text-brand-950">
                {formatLKR(rec.recommended_price)}
              </span>

              {/* Difference Badge */}
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold shadow-xs ${
                  isHigher
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-300/80"
                    : isLower
                    ? "bg-rose-50 text-rose-800 border border-rose-300/80"
                    : "bg-neutral-100 text-neutral-700 border border-neutral-300/80"
                }`}
              >
                {isHigher && (
                  <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                )}
                {isLower && (
                  <svg className="h-3.5 w-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                )}
                <span>
                  {isHigher
                    ? `+LKR ${Math.abs(Math.round(diffLkr)).toLocaleString("en-US")} (+${diffPct.toFixed(1)}%)`
                    : isLower
                    ? `-LKR ${Math.abs(Math.round(diffLkr)).toLocaleString("en-US")} (${diffPct.toFixed(1)}%)`
                    : "0 (0.0%)"}
                </span>
              </div>
            </div>

            <p className="mt-2 text-xs font-medium text-brand-900/80">
              {t("why.vsUsual", { price: formatLKR(rec.usual_price) })}
            </p>
          </section>

          {/* SECTION 2: EXPECTED ROOMS FILLED */}
          <section className="rounded-2xl border border-black/[0.06] bg-neutral-50/70 p-5">
            <h3 className="text-sm font-bold tracking-tight text-ink">
              {t("why.expectedRoomsFilled")}
            </h3>

            {/* Comparison Bars */}
            <div className="mt-3.5 space-y-3">
              {/* This Day */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-ink">{t("why.thisDay")}</span>
                  <span className="font-bold text-brand-800">
                    {breakdown.predicted_occupancy.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      breakdown.predicted_occupancy >= breakdown.typical_occupancy
                        ? "bg-gradient-to-r from-brand-500 to-emerald-500"
                        : "bg-gradient-to-r from-rose-400 to-amber-500"
                    }`}
                    style={{
                      width: `${Math.min(100, Math.max(5, Math.round(breakdown.predicted_occupancy)))}%`,
                    }}
                  />
                </div>
              </div>

              {/* Typical Day */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted">{t("why.typicalDay")}</span>
                  <span className="font-bold text-neutral-600">
                    {breakdown.typical_occupancy.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-400 transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(5, Math.round(breakdown.typical_occupancy)))}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Simple Sentence */}
            <p className="mt-3 text-xs sm:text-sm font-medium text-ink leading-relaxed">
              {roomsSentence}
            </p>
          </section>

          {/* SECTION 3: HOW WE GOT THIS PRICE (STEP LIST) */}
          <section className="rounded-2xl border border-black/[0.06] bg-neutral-50/70 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-ink">
                {t("why.howWeGotPrice")}
              </h3>

              {/* Tooltip trigger button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowWeightsTooltip((prev) => !prev)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs font-bold text-ink hover:bg-neutral-300 transition-colors"
                  aria-label="Weights explanation"
                >
                  ?
                </button>
              </div>
            </div>

            {/* Expandable Help Tooltip */}
            {showWeightsTooltip && (
              <div className="mt-2.5 rounded-xl border border-blue-200 bg-blue-50/90 p-3 text-xs font-medium text-blue-900 shadow-xs animate-apple-in">
                {t("why.weightsTooltip")}
              </div>
            )}

            {/* Step List Container */}
            <div className="mt-4 space-y-2.5">
              {/* Step 1: Usual Price */}
              <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-black/[0.04]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
                    1
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-ink">
                    {t("why.stepUsual")}
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-ink">
                  {formatLKR(breakdown.usual_price)}
                </span>
              </div>

              {/* Step 2: Demand Effect */}
              <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-black/[0.04]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
                    2
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-ink">
                    {t("why.stepDemand")}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    breakdown.demand_effect_lkr > 0
                      ? "text-emerald-700"
                      : breakdown.demand_effect_lkr < 0
                      ? "text-rose-700"
                      : "text-neutral-600"
                  }`}
                >
                  {breakdown.demand_effect_lkr > 0
                    ? `+LKR ${Math.abs(Math.round(breakdown.demand_effect_lkr)).toLocaleString("en-US")}`
                    : breakdown.demand_effect_lkr < 0
                    ? `-LKR ${Math.abs(Math.round(breakdown.demand_effect_lkr)).toLocaleString("en-US")}`
                    : "LKR 0"}
                </span>
              </div>

              {/* Step 3: Market Effect */}
              <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-black/[0.04]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-bold text-neutral-700">
                    3
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-ink">
                    {t("why.stepMarket")}
                  </span>
                </div>
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    breakdown.market_effect_lkr > 0
                      ? "text-emerald-700"
                      : breakdown.market_effect_lkr < 0
                      ? "text-rose-700"
                      : "text-neutral-600"
                  }`}
                >
                  {breakdown.market_effect_lkr > 0
                    ? `+LKR ${Math.abs(Math.round(breakdown.market_effect_lkr)).toLocaleString("en-US")}`
                    : breakdown.market_effect_lkr < 0
                    ? `-LKR ${Math.abs(Math.round(breakdown.market_effect_lkr)).toLocaleString("en-US")}`
                    : "LKR 0"}
                </span>
              </div>

              {/* Step 4: Price Limits (Shown ONLY if was_limited) */}
              {breakdown.was_limited && (
                <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-200/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[10px] font-bold text-amber-900">
                        !
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-amber-950">
                        {t("why.stepLimits")}
                      </span>
                    </div>
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        breakdown.limit_effect_lkr > 0
                          ? "text-emerald-700"
                          : breakdown.limit_effect_lkr < 0
                          ? "text-rose-700"
                          : "text-neutral-700"
                      }`}
                    >
                      {breakdown.limit_effect_lkr > 0
                        ? `+LKR ${Math.abs(Math.round(breakdown.limit_effect_lkr)).toLocaleString("en-US")}`
                        : breakdown.limit_effect_lkr < 0
                        ? `-LKR ${Math.abs(Math.round(breakdown.limit_effect_lkr)).toLocaleString("en-US")}`
                        : "LKR 0"}
                    </span>
                  </div>
                  <p className="mt-1 pl-7 text-[11px] font-medium text-amber-800 leading-normal">
                    {t("why.stepLimitsNote", {
                      min: formatLKR(breakdown.min_price),
                      max: formatLKR(breakdown.max_price),
                    })}
                  </p>
                </div>
              )}

              {/* Step 5: Suggested Price */}
              <div className="flex items-center justify-between rounded-xl bg-brand-500/10 p-3 border border-brand-500/30">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    ✓
                  </span>
                  <span className="text-xs sm:text-sm font-black text-brand-950">
                    {t("why.stepSuggested")}
                  </span>
                </div>
                <span className="text-sm sm:text-base font-black text-brand-900">
                  {formatLKR(breakdown.final_price || rec.recommended_price)}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 4: MAIN REASONS */}
          <section className="rounded-2xl border border-black/[0.06] bg-neutral-50/70 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold tracking-tight text-ink">
                {t("why.reasonsTitle")}
              </h3>
              <span className="text-xs font-semibold text-muted">
                {displayedReasons.length} / {allReasons.length}
              </span>
            </div>

            {displayedReasons.length === 0 ? (
              <p className="mt-3 text-xs text-muted">{t("why.noReasons")}</p>
            ) : (
              <div className="mt-3.5 space-y-3">
                {displayedReasons.map((reason, idx) => {
                  const factorTitle = has(`why.factorLabels.${reason.factor}`)
                    ? t(`why.factorLabels.${reason.factor}`)
                    : has(`why.factors.${reason.factor}`)
                    ? t(`why.factors.${reason.factor}`)
                    : reason.factor;

                  const formattedVal = formatFactorValue(reason.factor, reason.value, t);
                  const hasTypical = reason.typical !== null && reason.typical !== undefined;
                  const formattedTyp = hasTypical
                    ? formatFactorValue(reason.factor, reason.typical, t)
                    : null;

                  const occPoints = reason.occupancy_points ?? 0;
                  const isPointsUp = occPoints > 0;
                  const isPointsDown = occPoints < 0;
                  const pointsStr = isPointsUp
                    ? `+${occPoints.toFixed(1)}`
                    : isPointsDown
                    ? `${occPoints.toFixed(1)}`
                    : "0.0";

                  const priceEff = reason.price_effect_lkr ?? 0;
                  const effStr =
                    priceEff > 0
                      ? `+LKR ${Math.abs(Math.round(priceEff)).toLocaleString("en-US")}`
                      : priceEff < 0
                      ? `-LKR ${Math.abs(Math.round(priceEff)).toLocaleString("en-US")}`
                      : "LKR 0";

                  // Relative magnitude bar
                  const barLengthPct = Math.min(
                    100,
                    Math.max(12, Math.round((Math.abs(occPoints) / maxOccupancyPoints) * 100))
                  );

                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-black/[0.05] bg-white p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                    >
                      {/* Reason Label & Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs sm:text-sm font-bold text-ink">
                          {factorTitle}
                        </span>

                        {/* Occupancy Points Badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            isPointsUp
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : isPointsDown
                              ? "bg-rose-50 text-rose-800 border-rose-200"
                              : "bg-neutral-100 text-neutral-700 border-neutral-200"
                          }`}
                        >
                          {t("why.occupancyPointsBadge", { points: pointsStr })}
                        </span>
                      </div>

                      {/* Values row: This day & Normal */}
                      <div className="mt-1.5 text-xs font-medium text-muted">
                        <span>{t("why.thisDayLabel", { value: formattedVal })}</span>
                        {hasTypical && formattedTyp && (
                          <>
                            <span className="mx-2 text-neutral-300">|</span>
                            <span>{t("why.normalLabel", { typical: formattedTyp })}</span>
                          </>
                        )}
                      </div>

                      {/* Price Effect */}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span
                          className={`font-bold ${
                            priceEff > 0
                              ? "text-emerald-700"
                              : priceEff < 0
                              ? "text-rose-700"
                              : "text-neutral-600"
                          }`}
                        >
                          {t("why.priceEffectText", { effect: effStr })}
                        </span>

                        <span className="text-[10px] text-muted">
                          {barLengthPct}%
                        </span>
                      </div>

                      {/* Magnitude Bar */}
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPointsUp ? "bg-emerald-500" : isPointsDown ? "bg-rose-500" : "bg-neutral-400"
                          }`}
                          style={{ width: `${barLengthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Show More / Show Less Button */}
            {allReasons.length > 3 && (
              <button
                type="button"
                onClick={() => setShowAllReasons((prev) => !prev)}
                className="mt-3.5 w-full rounded-xl border border-black/[0.08] bg-white py-2 text-xs font-bold text-ink hover:bg-neutral-50 active:scale-[0.99] transition-all"
              >
                {showAllReasons
                  ? t("why.showLess")
                  : t("why.showMore", { count: allReasons.length - 3 })}
              </button>
            )}
          </section>

          {/* SECTION 5: COMPETITORS */}
          <section className="rounded-2xl border border-black/[0.06] bg-neutral-50/70 p-5">
            <h3 className="text-sm font-bold tracking-tight text-ink">
              {t("why.competitorsTitle")}
            </h3>
            <p className="mt-1.5 text-sm sm:text-base font-bold text-ink">
              {t("why.competitorCharge", { price: formatLKR(compPrice) })}
            </p>
            <p className="mt-1 text-xs font-medium text-muted leading-relaxed">
              {t("why.sourceNote", { source: sourceText })}
            </p>
          </section>

          {/* SECTION 6: FOOTNOTE */}
          <p className="text-xs text-muted leading-relaxed text-center sm:text-left px-1">
            {t("why.footnote")}
          </p>
        </div>

        {/* Action Button Footer */}
        <div className="p-4 sm:p-5 border-t border-black/[0.06] bg-white/80">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary w-full"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
