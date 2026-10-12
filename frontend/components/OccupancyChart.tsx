"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Recommendation } from "@/lib/api";
import { formatAxisDate, formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface OccupancyChartProps {
  data: Recommendation[];
}

export default function OccupancyChart({ data }: OccupancyChartProps) {
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
    occupancy: Math.round(item.predicted_occupancy),
  }));

  return (
    <div className="w-full">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <defs>
              {/* Apple-style smooth gradient fill */}
              <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
              </linearGradient>
            </defs>
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
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: "#86868b", fontSize: 12, fontWeight: 500 }}
              stroke="transparent"
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload as { date: string; occupancy: number };
                  return (
                    <div className="rounded-2xl border border-black/[0.06] bg-white/95 p-3.5 shadow-xl backdrop-blur-xl animate-apple-in">
                      <p className="text-xs font-semibold text-muted">
                        {formatDate(p.date, lang)}
                      </p>
                      <p className="mt-1 text-base font-extrabold tracking-tight text-brand-700">
                        {t("results.occupancy")}: {p.occupancy}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="occupancy"
              stroke="#059669"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#occupancyGradient)"
              dot={{ fill: "#059669", r: 3.5, strokeWidth: 2, stroke: "#ffffff" }}
              activeDot={{ r: 6, fill: "#047857", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
