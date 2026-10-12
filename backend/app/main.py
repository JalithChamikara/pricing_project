import os
from datetime import date

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator

from app.engine import PricingService

load_dotenv()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _folder(env_name: str, default: str) -> str:
    """Folder from .env (or default). Relative paths start from the backend folder."""
    p = os.getenv(env_name, default)
    return p if os.path.isabs(p) else os.path.normpath(os.path.join(BASE_DIR, p))


# Project layout:  pricing_project/backend  (this code),  pricing_project/models,  pricing_project/data/clean
service = PricingService(_folder("MODELS_DIR", "../models"), _folder("DATA_DIR", "../data/clean"))

app = FastAPI(title="AI Pricing Optimization API", version="1.0")

origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])

MAX_DAYS = 60


class ForecastRequest(BaseModel):
    start_date: date
    end_date: date
    arrivals_change_pct: float = Field(0, ge=-50, le=100, description="Expected tourist arrivals vs a normal year, in %")
    demand_surge: bool = False

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if (self.end_date - self.start_date).days + 1 > MAX_DAYS:
            raise ValueError(f"Please choose at most {MAX_DAYS} days")
        return self


class RecommendRequest(ForecastRequest):
    district: str
    property_type: str
    base_rate: float = Field(gt=0, description="Your usual room price per night (LKR)")
    competitor_price: float | None = Field(None, gt=0, description="Optional: a competitor price you know (LKR)")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/options")
def options():
    return {"districts": service.districts(), "property_types": service.property_types()}


@app.get("/market-reference")
def market_reference(district: str, property_type: str):
    level, source, n = service.market_reference(district, property_type)
    return {"median_price_lkr": round(level), "based_on": source, "scraped_hotels": n}


@app.post("/forecast")
def forecast(req: ForecastRequest):
    days, _, pred = service.forecast(req.start_date, req.end_date, req.arrivals_change_pct, req.demand_surge)
    return {"forecast": [{"date": d.isoformat(), "predicted_occupancy": round(float(p), 1)} for d, p in zip(days, pred)]}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    if req.district not in service.districts():
        raise HTTPException(400, f"district must be one of {service.districts()}")
    if req.property_type not in service.property_types():
        raise HTTPException(400, f"property_type must be one of {service.property_types()}")
    results, info = service.recommend(req.district, req.property_type, req.base_rate, req.start_date, req.end_date,
                                      req.arrivals_change_pct, req.demand_surge, req.competitor_price)
    return {"info": info, "recommendations": results}
