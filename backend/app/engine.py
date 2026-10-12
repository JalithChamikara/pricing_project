"""Loads the trained model and the pricing engine, and builds a price recommendation for each day."""
import importlib.util
import json
from datetime import date, timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import shap
from xgboost import XGBRegressor

# The scraped market prices were collected for check-in dates in this month (October 2026).
SNAPSHOT_MONTH = 10
# The seasonal shape of competitor prices is limited to this range,
# so one unusual month cannot make prices jump too much.
SHAPE_MIN, SHAPE_MAX = 0.8, 1.4

# Keys the website uses to translate each reason into English, Sinhala and Tamil
FACTOR_KEY = {
    "SLTDA_Tourist_Arrivals": "tourist_arrivals",
    "Booking_Lead_Time": "booking_lead_time",
    "Seasonality_Index_Norm": "season",
    "Season_Code": "season",
    "Day_of_Week": "day_of_week",
    "Is_Weekend": "weekend",
    "Month": "month",
    "Demand_Surge_Flag": "demand_surge",
    "Arrivals_Lag7": "arrivals_last_week",
    "Arrivals_Roll7": "arrivals_trend",
    "Occupancy_Lag7": "occupancy_last_week",
}


class PricingService:
    def __init__(self, models_dir: str, data_dir: str):
        models_dir, data_dir = Path(models_dir), Path(data_dir)

        # Preferred: portable XGBoost file (works across library versions).
        # Fallback: the older .pkl file (needs the same XGBoost version as Colab).
        json_path = models_dir / "xgboost_model.json"
        if json_path.exists():
            self.model = XGBRegressor()
            self.model.load_model(str(json_path))
        else:
            self.model = joblib.load(models_dir / "xgboost.pkl")
        self.features = joblib.load(models_dir / "features.pkl")
        with open(models_dir / "train_median.json") as f:
            self.train_median = json.load(f)

        spec = importlib.util.spec_from_file_location("pricing_engine", models_dir / "pricing_engine.py")
        self.pe = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.pe)

        self.explainer = shap.TreeExplainer(self.model)

        hist = pd.read_csv(data_dir / "main_clean.csv", parse_dates=["Date"])
        hist["Month"] = hist.Date.dt.month
        # Normal (average) values for each month. We use these for future days,
        # because real tourist arrivals for the future are not known yet.
        self.profile = hist.groupby("Month").agg(
            arrivals=("SLTDA_Tourist_Arrivals", "mean"),
            lead=("Booking_Lead_Time", "mean"),
            season_norm=("Seasonality_Index_Norm", "mean"),
            season_code=("Season_Code", "mean"),
            occupancy=("Historical_Occupancy_Rate", "mean"),
            comp=("Competitor_Avg_Price_LKR", "mean"),
        )
        self.market = pd.read_csv(data_dir / "market_summary.csv")

    # ---------- market reference ----------
    def districts(self):
        return sorted(self.market.district.unique().tolist())

    def property_types(self):
        return sorted(self.market.property_type.unique().tolist())

    def market_reference(self, district: str, property_type: str):
        """Median scraped price for this district and property type, with fallbacks."""
        m = self.market
        exact = m[(m.district == district) & (m.property_type == property_type)]
        if len(exact) and exact["count"].iloc[0] >= 3:
            r = exact.iloc[0]
            return float(r.median_lkr), "district + property type", int(r["count"])
        d = m[m.district == district]
        if len(d):
            return float(np.average(d.median_lkr, weights=d["count"])), "district only", int(d["count"].sum())
        t = m[m.property_type == property_type]
        if len(t):
            return float(np.average(t.median_lkr, weights=t["count"])), "property type only", int(t["count"].sum())
        return float(np.average(m.median_lkr, weights=m["count"])), "all scraped hotels", int(m["count"].sum())

    def competitor_price_for_month(self, market_level: float, month: int) -> float:
        """Market price level (from the scrape) x seasonal shape (from history)."""
        shape = self.profile.comp.loc[month] / self.profile.comp.loc[SNAPSHOT_MONTH]
        return float(market_level * np.clip(shape, SHAPE_MIN, SHAPE_MAX))

    # ---------- features for a future day ----------
    def build_features(self, d: date, arrivals_change_pct: float = 0.0, demand_surge: bool = False) -> dict:
        p = self.profile.loc[d.month]
        arrivals = p.arrivals * (1 + arrivals_change_pct / 100)
        return {
            "SLTDA_Tourist_Arrivals": arrivals,
            "Booking_Lead_Time": p.lead,
            "Seasonality_Index_Norm": p.season_norm,
            "Season_Code": float(round(p.season_code)),
            "Day_of_Week": d.weekday(),
            "Is_Weekend": int(d.weekday() >= 5),
            "Month": d.month,
            "Demand_Surge_Flag": int(demand_surge),
            "Arrivals_Lag7": arrivals,
            "Arrivals_Roll7": arrivals,
            "Occupancy_Lag7": p.occupancy,
        }

    def structured_reasons(self, row, shap_row, base_rate, top_n=5):
        """Reasons as data with real numbers, so the website can show and translate them.
        occupancy_points = how many occupancy % points this factor added or removed (SHAP value).
        price_effect_lkr = what that means for the suggested price (before limits and rounding)."""
        cfg = self.pe.CONFIG
        per_point = cfg["W"] * base_rate * cfg["K"] / 100          # LKR per 1 occupancy point
        show_feature = {                                              # the input shown to the owner for each factor
            "tourist_arrivals": "SLTDA_Tourist_Arrivals", "booking_lead_time": "Booking_Lead_Time",
            "season": "Season_Code", "day_of_week": "Day_of_Week", "weekend": "Is_Weekend",
            "month": "Month", "demand_surge": "Demand_Surge_Flag", "arrivals_last_week": "Arrivals_Lag7",
            "arrivals_trend": "Arrivals_Roll7", "occupancy_last_week": "Occupancy_Lag7",
        }
        season_names = {0: "off_peak", 1: "shoulder", 2: "peak"}

        groups = {}
        for f, v in zip(self.features, shap_row):
            groups[FACTOR_KEY[f]] = groups.get(FACTOR_KEY[f], 0.0) + float(v)

        out = []
        for key, pts in sorted(groups.items(), key=lambda kv: -abs(kv[1]))[:top_n]:
            f = show_feature[key]
            value, typical = float(row[f]), float(self.train_median[f])
            if key == "season":
                value, typical = season_names[int(round(value))], season_names[int(round(typical))]
            elif key in ("weekend", "demand_surge"):
                value, typical = bool(value), None
            elif key == "day_of_week":
                value, typical = int(value), None                    # 0 = Monday
            elif key == "month":
                value, typical = int(value), None
            else:
                value, typical = round(value, 1), round(typical, 1)
            high = (value == "peak") if key == "season" else (value > typical if isinstance(typical, float) else bool(value))
            out.append({
                "factor": key,
                "level": "high" if high else "low",
                "direction": "up" if pts > 0 else "down",
                "value": value,
                "typical": typical,
                "occupancy_points": round(pts, 1),
                "price_effect_lkr": round(pts * per_point),
            })
        return out

    def price_breakdown(self, pred, base_rate, comp, final_price):
        """Step-by-step: usual price -> demand effect -> market effect -> limits/rounding -> suggested price."""
        cfg = self.pe.CONFIG
        W, K, normal = cfg["W"], cfg["K"], cfg["normal_occupancy"]
        typical = float(np.ravel(self.explainer.expected_value)[0])
        demand_price = base_rate * (1 + K * (pred - normal) / 100)
        demand_effect = W * (demand_price - base_rate)
        market_effect = (1 - W) * (comp - base_rate)
        raw = base_rate + demand_effect + market_effect
        lo, hi = cfg["min_factor"] * base_rate, cfg["max_factor"] * base_rate
        limited = float(np.clip(raw, lo, hi))
        return {
            "usual_price": round(base_rate),
            "typical_occupancy": round(typical, 1),
            "predicted_occupancy": round(pred, 1),
            "normal_occupancy": normal,
            "weight_demand": W,
            "weight_market": round(1 - W, 2),
            "typical_day_effect_lkr": round(W * base_rate * K * (typical - normal) / 100),
            "demand_effect_lkr": round(demand_effect),
            "market_effect_lkr": round(market_effect),
            "limit_effect_lkr": round(limited - raw),
            "rounding_effect_lkr": round(final_price - limited),
            "competitor_price": round(comp),
            "min_price": round(lo),
            "max_price": round(hi),
            "was_limited": bool(abs(limited - raw) > 1),
            "final_price": round(final_price),
        }

    # ---------- main functions ----------
    def forecast(self, start: date, end: date, arrivals_change_pct=0.0, demand_surge=False):
        days = [start + timedelta(days=i) for i in range((end - start).days + 1)]
        rows = pd.DataFrame([self.build_features(d, arrivals_change_pct, demand_surge) for d in days])[self.features]
        pred = np.clip(self.model.predict(rows), 0, 100)
        return days, rows, pred

    def recommend(self, district, property_type, base_rate, start, end,
                  arrivals_change_pct=0.0, demand_surge=False, competitor_price=None):
        days, rows, pred = self.forecast(start, end, arrivals_change_pct, demand_surge)
        shap_values = self.explainer.shap_values(rows)

        if competitor_price is not None:
            level, source, n = float(competitor_price), "entered by the owner", 0
        else:
            level, source, n = self.market_reference(district, property_type)

        out = []
        for i, d in enumerate(days):
            comp = float(competitor_price) if competitor_price is not None else self.competitor_price_for_month(level, d.month)
            price = self.pe.recommend_price(float(pred[i]), base_rate, comp)
            text = self.pe.explain_day(self.features, rows.iloc[i], shap_values[i], self.train_median,
                                       float(pred[i]), price, base_rate, comp)
            out.append({
                "date": d.isoformat(),
                "predicted_occupancy": round(float(pred[i]), 1),
                "recommended_price": price,
                "competitor_price": round(comp),
                "explanation": text,
                "price_vs_usual": "higher" if price > base_rate else "lower" if price < base_rate else "same",
                "usual_price": round(base_rate),
                "reasons": self.structured_reasons(rows.iloc[i], shap_values[i], base_rate),
                "breakdown": self.price_breakdown(float(pred[i]), base_rate, comp, price),
            })
        return out, {"competitor_source": source, "scraped_hotels_used": n, "market_level_lkr": round(level)}