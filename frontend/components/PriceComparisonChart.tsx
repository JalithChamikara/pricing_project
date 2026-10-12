"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import type { Recommendation } from "@/lib/api";
import { formatAxisDate, formatDate, formatLKR } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface PriceComparisonChartProps {
  data: Recommendation[];
}

export default function PriceComparisonChart({ data }: PriceComparisonChartProps) {
  const { lang, t } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only chart rendering
    setMounted(true);
  }, []);

  if (!mounted || !data || data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-black/[0.02] text-sm text-muted">
        {t("common.loading")}
      </div>
    );
  }

  const chartData = data.map((item) => ({
    date: item.date,
    suggested: item.recommended_price,
    usual: item.usual_price,
    competitor: item.competitor_price,
  }));

  return (
    <div className="w-full">
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 12, right: 10, left: -10, bottom: 0 }} barGap={2} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => formatAxisDate(val)}
              tick={{ fill: "#86868b", fontSize: 12, fontWeight: 500 }}
              stroke="transparent"
              tickLine={false}
              dy={6}
            />
            <YAxis
              tickFormatter={(v) => `${Math.round(v / 1000)}k`}
              tick={{ fill: "#86868b", fontSize: 12, fontWeight: 500 }}
              stroke="transparent"
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload as {
                    date: string;
                    suggested: number;
                    usual: number;
                    competitor: number;
                  };
                  return (
                    <div className="rounded-2xl border border-black/[0.06] bg-white/95 p-4 shadow-xl backdrop-blur-xl animate-apple-in">
                      <p className="border-b border-black/[0.05] pb-2 text-xs font-bold text-muted">
                        {formatDate(p.date, lang)}
                      </p>
                      <div className="mt-2.5 space-y-1.5 text-sm font-semibold tracking-tight">
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-brand-700">
                            <span className="h-2 w-2 rounded-full bg-brand-600" />
                            {t("results.suggested")}
                          </span>
                          <span className="font-extrabold text-ink">{formatLKR(p.suggested)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-muted">
                            <span className="h-2 w-2 rounded-full bg-neutral-400" />
                            {t("results.usual")}
                          </span>
                          <span className="font-semibold text-neutral-600">{formatLKR(p.usual)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="flex items-center gap-1.5 text-amber-700">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            {t("results.competitor")}
                          </span>
                          <span className="font-semibold text-amber-900">{formatLKR(p.competitor)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              formatter={(value: string) => {
                if (value === "suggested") return t("results.suggested");
                if (value === "usual") return t("results.usual");
                if (value === "competitor") return t("results.competitor");
                return value;
              }}
              wrapperStyle={{ paddingTop: 16, fontSize: 13, fontWeight: 500 }}
            />
            {/* Apple pill rounded bar corners */}
            <Bar dataKey="suggested" fill="#059669" radius={[8, 8, 2, 2]} name="suggested" />
            <Bar dataKey="usual" fill="#9ca3af" radius={[8, 8, 2, 2]} name="usual" />
            <Bar dataKey="competitor" fill="#f59e0b" radius={[8, 8, 2, 2]} name="competitor" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
