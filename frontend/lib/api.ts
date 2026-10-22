/**
 * Typed client for the FastAPI pricing backend.
 * Errors are turned into an ApiError with a "kind" so the UI can show a translated message.
 */

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export type ReasonLevel = "high" | "low";
export type ReasonDirection = "up" | "down";

export interface Reason {
  factor: string;
  level: ReasonLevel;
  direction: ReasonDirection;
  value?: number | string | boolean;
  typical?: number | string | null;
  occupancy_points?: number;
  price_effect_lkr?: number;
}

export interface PriceBreakdown {
  usual_price: number;
  typical_occupancy: number;
  predicted_occupancy: number;
  normal_occupancy: number;
  weight_demand: number;
  weight_market: number;
  typical_day_effect_lkr: number;
  demand_effect_lkr: number;
  market_effect_lkr: number;
  limit_effect_lkr: number;
  rounding_effect_lkr: number;
  competitor_price: number;
  min_price: number;
  max_price: number;
  was_limited: boolean;
  final_price: number;
}

export interface Recommendation {
  date: string;
  predicted_occupancy: number;
  recommended_price: number;
  competitor_price: number;
  explanation: string;
  price_vs_usual: "higher" | "lower" | "same";
  usual_price: number;
  reasons: Reason[];
  breakdown?: PriceBreakdown;
}

export interface RecommendInfo {
  competitor_source: string;
  scraped_hotels_used: number;
  market_level_lkr: number;
}

export interface RecommendResponse {
  info: RecommendInfo;
  recommendations: Recommendation[];
}

export interface RecommendRequest {
  district: string;
  property_type: string;
  base_rate: number;
  start_date: string;
  end_date: string;
  arrivals_change_pct: number;
  demand_surge: boolean;
  competitor_price?: number;
}

export interface OptionsResponse {
  districts: string[];
  property_types: string[];
}

export interface MarketReference {
  median_price_lkr: number;
  based_on: string;
  scraped_hotels: number;
}

export interface ForecastResponse {
  forecast: { date: string; predicted_occupancy: number }[];
}

/** Matches the keys under "apiErrors" in the dictionaries. */
export type ApiErrorKind = "offline" | "badRequest" | "validation" | "server";

export class ApiError extends Error {
  constructor(
    public kind: ApiErrorKind,
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError("offline", "API not reachable");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { detail?: unknown };
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* body was not JSON */
    }
    const kind: ApiErrorKind =
      res.status === 400 ? "badRequest" : res.status === 422 ? "validation" : "server";
    throw new ApiError(kind, detail, res.status);
  }

  return (await res.json()) as T;
}

export function getOptions(): Promise<OptionsResponse> {
  return request<OptionsResponse>("/options");
}

export function getMarketReference(district: string, propertyType: string): Promise<MarketReference> {
  const q = new URLSearchParams({ district, property_type: propertyType });
  return request<MarketReference>(`/market-reference?${q.toString()}`);
}

export function getRecommendations(body: RecommendRequest): Promise<RecommendResponse> {
  return request<RecommendResponse>("/recommend", { method: "POST", body: JSON.stringify(body) });
}

export function getForecast(body: Pick<RecommendRequest, "start_date" | "end_date" | "arrivals_change_pct" | "demand_surge">): Promise<ForecastResponse> {
  return request<ForecastResponse>("/forecast", { method: "POST", body: JSON.stringify(body) });
}

/** Translation key for any error thrown by the API client. */
export function apiErrorKey(err: unknown): string {
  return err instanceof ApiError ? `apiErrors.${err.kind}` : "apiErrors.server";
}
