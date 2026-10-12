# AI Pricing Optimization - Backend (FastAPI)

This server loads your trained XGBoost model and pricing engine, and gives the website a price and a simple explanation for each day.

## 1. Folder layout
```
pricing_project/
  backend/    <- this project (app, tests, requirements.txt ...)
  models/     <- xgboost.pkl, features.pkl, train_median.json, pricing_engine.py, pricing_config.json
  data/clean/ <- main_clean.csv, market_summary.csv
```
The server reads the model and data from the `models` and `data/clean` folders next to `backend`. You do not need to copy any files.

## 2. Install and run
```bash
python -m venv venv
venv\Scripts\activate          # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # Mac/Linux: cp .env.example .env
uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000/docs - you can test every endpoint in the browser.

## 3. Run the automatic tests
```bash
pytest -q tests
```
You should see `5 passed`.

## 4. Endpoints
| Method | URL | What it does |
|---|---|---|
| GET | `/health` | Check the server is running |
| GET | `/options` | Districts and property types for the website drop-downs |
| GET | `/market-reference?district=Galle&property_type=guesthouse` | Median scraped competitor price |
| POST | `/forecast` | Predicted occupancy for a date range |
| POST | `/recommend` | Price + explanation for each day |

Example body for `/recommend`:
```json
{
  "district": "Galle",
  "property_type": "guesthouse",
  "base_rate": 12000,
  "start_date": "2026-12-20",
  "end_date": "2026-12-26",
  "arrivals_change_pct": 0,
  "demand_surge": false
}
```

## 5. How future days are handled (write this in your thesis)
Real tourist arrivals for future dates are not known. For each future day the server uses the **normal (average) values of that month** from 2024-2025 (arrivals, lead time, season, occupancy). The owner can change the expected tourist arrivals with `arrivals_change_pct` (for example +10) and can mark a special demand surge.

The competitor price is the **median scraped price** for the district and property type (October 2026 scrape), multiplied by the seasonal shape of competitor prices from the 2024-2025 data. The owner can also type a competitor price.

## 6. Supabase
Run `supabase_schema.sql` in your Supabase project (SQL Editor). It creates the tables for properties and saved recommendations. The website (next step) will use Supabase for login and for saving history.

## 7. Postman
Import `postman_collection.json` to test the API (your thesis says Postman is used for API testing).
