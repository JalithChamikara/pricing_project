import type { Reason, Recommendation } from "./api";
import { getSupabase } from "./supabase";

/** Database row types and queries (RLS makes sure users only see their own rows). */

export interface Property {
  id: string;
  user_id: string;
  name: string;
  district: string;
  property_type: string;
  rooms: number | null;
  amenities?: string[] | null;
  base_rate: number;
  created_at: string;
}

export type PropertyInput = {
  name: string;
  district: string;
  property_type: string;
  rooms: number;
  amenities: string[];
  base_rate: number;
};

export interface SavedRecommendation {
  id: string;
  property_id: string;
  stay_date: string;
  predicted_occupancy: number | null;
  recommended_price: number;
  competitor_price: number | null;
  explanation: string | null;
  reasons: Reason[] | null;
  created_at: string;
  properties: { name: string } | null;
}

export async function listProperties(): Promise<Property[]> {
  const { data, error } = await getSupabase()
    .from("properties")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Property[];
}

export async function createProperty(input: PropertyInput): Promise<Property> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not logged in");
  const payload: Record<string, unknown> = { ...input, user_id: auth.user.id };
  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select()
    .single();
  if (error) {
    if (error.code === "42703" && error.message?.includes("amenities")) {
      console.warn("Table properties has no amenities column yet. Please run: ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}'::text[];");
      delete payload.amenities;
      const retry = await supabase
        .from("properties")
        .insert(payload)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return retry.data as Property;
    }
    throw error;
  }
  return data as Property;
}

export async function updateProperty(id: string, input: PropertyInput): Promise<Property> {
  const supabase = getSupabase();
  const payload: Record<string, unknown> = { ...input };
  const { data, error } = await supabase
    .from("properties")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    if (error.code === "42703" && error.message?.includes("amenities")) {
      console.warn("Table properties has no amenities column yet. Please run: ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities text[] DEFAULT '{}'::text[];");
      delete payload.amenities;
      const retry = await supabase
        .from("properties")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      return retry.data as Property;
    }
    throw error;
  }
  return data as Property;
}

export async function saveRecommendations(propertyId: string, recs: Recommendation[]): Promise<void> {
  const rows = recs.map((r) => ({
    property_id: propertyId,
    stay_date: r.date,
    predicted_occupancy: r.predicted_occupancy,
    recommended_price: r.recommended_price,
    competitor_price: r.competitor_price,
    explanation: r.explanation,
    reasons: r.reasons,
  }));
  const { error } = await getSupabase().from("price_recommendations").insert(rows);
  if (error) throw error;
}

export async function listSavedRecommendations(propertyId?: string): Promise<SavedRecommendation[]> {
  let query = getSupabase()
    .from("price_recommendations")
    .select("*, properties(name)")
    .order("created_at", { ascending: false })
    .order("stay_date", { ascending: true })
    .limit(500);
  if (propertyId) query = query.eq("property_id", propertyId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SavedRecommendation[];
}

export async function saveSusResponse(answers: Record<string, number>, score: number, language: string): Promise<void> {
  const supabase = getSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not logged in");
  const { error } = await supabase
    .from("sus_responses")
    .insert({ user_id: auth.user.id, answers, score, language });
  if (error) throw error;
}
