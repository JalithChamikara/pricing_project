
import numpy as np

CONFIG = {'normal_occupancy': 60, 'K': 1.0, 'W': 0.6, 'min_factor': 0.9, 'max_factor': 2.0, 'round_to': 50}

FRIENDLY = {'SLTDA_Tourist_Arrivals': 'tourist arrivals', 'Booking_Lead_Time': 'how early guests are booking', 'Seasonality_Index_Norm': 'the tourist season', 'Season_Code': 'the tourist season', 'Day_of_Week': 'the day of the week', 'Is_Weekend': 'the weekend', 'Month': 'the month', 'Demand_Surge_Flag': 'a special demand surge', 'Arrivals_Lag7': "last week's tourist arrivals", 'Arrivals_Roll7': 'the recent trend in tourist arrivals', 'Occupancy_Lag7': "last week's occupancy"}

def recommend_price(pred_occ, base_rate, competitor_price, cfg=CONFIG):
    demand_price = base_rate * (1 + cfg["K"] * (pred_occ - cfg["normal_occupancy"]) / 100)
    price = cfg["W"] * demand_price + (1 - cfg["W"]) * competitor_price
    price = np.clip(price, cfg["min_factor"] * base_rate, cfg["max_factor"] * base_rate)
    return float(np.round(price / cfg["round_to"]) * cfg["round_to"])

def explain_day(features, row, shap_row, train_median, pred_occ, price, base, comp, top_n=3):
    # join inputs that have the same easy name (for example the two season inputs)
    groups = {}
    for f, s in zip(features, shap_row):
        name = FRIENDLY[f]
        groups.setdefault(name, [0.0, f])
        groups[name][0] += float(s)
    top = sorted(groups.items(), key=lambda kv: -abs(kv[1][0]))[:top_n]
    reasons = []
    for name, (s, f) in top:
        up = s > 0
        level = "high" if row[f] > train_median[f] else "low"
        verb = "pushes demand up" if up else "pushes demand down"
        if (level == "high") == up:
            reasons.append(f"{name} is {level}, which {verb}")
        else:
            reasons.append(f"{name} {verb}")
    move = "higher than" if price > base else "lower than" if price < base else "the same as"
    return (f"Suggested price: LKR {price:,.0f} ({move} your usual LKR {base:,.0f}). "
            f"Expected occupancy: {pred_occ:.0f}%. Why: " + "; ".join(reasons) +
            f". Competitors charge about LKR {comp:,.0f}.")
