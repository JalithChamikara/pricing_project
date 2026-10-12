"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { saveSusResponse } from "@/lib/db";

const QUESTION_KEYS = [
  "q1",
  "q2",
  "q3",
  "q4",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
] as const;

export default function FeedbackPage() {
  const { lang, t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  const handleSelect = (qKey: string, val: number) => {
    setAnswers((prev) => ({ ...prev, [qKey]: val }));
    setErrorMsg(null);
  };

  const answeredCount = Object.keys(answers).length;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (answeredCount < 10) {
      setErrorMsg(t("feedback.missing", { count: 10 - answeredCount }));
      return;
    }

    let sum = 0;
    QUESTION_KEYS.forEach((qKey, index) => {
      const ans = answers[qKey];
      const isOdd = (index + 1) % 2 === 1;
      if (isOdd) {
        sum += ans - 1;
      } else {
        sum += 5 - ans;
      }
    });

    const finalScore = Math.round(sum * 2.5 * 10) / 10;

    setLoading(true);
    try {
      await saveSusResponse(answers, finalScore, lang);
      setSubmittedScore(finalScore);
    } catch {
      setErrorMsg(t("feedback.saveError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-apple-in">
      {/* Title & Introduction Card */}
      <div className="card">
        <h1 className="text-3xl font-black tracking-tight text-ink">
          {t("feedback.title")}
        </h1>
        <p className="mt-2 text-[15px] font-medium text-muted">
          {t("feedback.intro")}
        </p>
        <div className="mt-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 p-4 text-xs sm:text-sm font-semibold text-brand-900">
          {t("feedback.scaleHint")}
        </div>
      </div>

      {/* Success View after Submission */}
      {submittedScore !== null ? (
        <div className="card py-12 text-center border-brand-500/30 shadow-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-700 shadow-sm">
            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-ink">
            {t("feedback.thankYouTitle")}
          </h2>
          <p className="mt-2 text-sm font-medium text-muted max-w-md mx-auto">
            {t("feedback.thankYouText")}
          </p>

          <div className="mx-auto mt-7 max-w-xs rounded-3xl border border-brand-500/25 bg-gradient-to-br from-brand-500/10 to-white p-6 shadow-sm">
            <span className="block text-xs font-bold uppercase tracking-widest text-muted">
              {t("feedback.scoreLabel")}
            </span>
            <span className="mt-1 block text-5xl font-black tracking-tight text-brand-700">
              {submittedScore}
            </span>
            <span className="mt-1 block text-xs font-semibold text-muted">
              {t("feedback.scoreOutOf")}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setSubmittedScore(null);
            }}
            className="btn-secondary mt-8"
          >
            {t("feedback.again")}
          </button>
        </div>
      ) : (
        /* Questions Form */
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="alert-error" role="alert">
              {errorMsg}
            </div>
          )}

          {QUESTION_KEYS.map((qKey, index) => {
            const currentVal = answers[qKey];
            const qNum = index + 1;

            return (
              <fieldset
                key={qKey}
                className="card border-black/[0.06] p-5 sm:p-6 transition-all hover:border-black/[0.12] hover:shadow-md"
              >
                <legend className="text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  {t("feedback.questionNumber", { number: qNum })}
                </legend>

                <p className="mt-2 text-[17px] font-bold tracking-tight text-ink">
                  {t(`feedback.questions.${qKey}`)}
                </p>

                {/* 1 to 5 iOS Control Center Buttons */}
                <div className="mt-4 grid grid-cols-5 gap-2 sm:gap-3">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = currentVal === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleSelect(qKey, val)}
                        className={`flex min-h-[58px] flex-col items-center justify-center rounded-2xl p-2 transition-all duration-150 select-none ${
                          isSelected
                            ? "bg-brand-600 text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] scale-[1.03] font-bold"
                            : "bg-neutral-100/90 text-ink hover:bg-neutral-200/70 active:scale-95"
                        }`}
                      >
                        <span className="text-xl font-black">{val}</span>
                        <span className={`text-[10px] leading-tight text-center font-medium line-clamp-1 hidden sm:block ${isSelected ? "text-white" : "text-muted"}`}>
                          {t(`feedback.scale.${val}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          {/* Form Actions */}
          <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sticky bottom-4 z-20 shadow-xl backdrop-blur-xl bg-white/95 border-black/[0.08]">
            <span className="text-xs sm:text-sm font-bold text-muted">
              {answeredCount}/10 answered
            </span>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full sm:w-auto sm:min-w-64"
            >
              {loading ? t("feedback.submitting") : t("feedback.submit")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
