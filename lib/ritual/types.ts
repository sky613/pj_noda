export type RitualMethod = "discard" | "donate" | "give";
export type RitualStatus = "in_progress" | "cooling" | "released" | "kept";
export type RitualStep = "select" | "name" | "farewell" | "method" | "release";
export type CoolingDays = 3 | 7;

export interface Ritual {
  id: string;
  user_id: string;
  step: RitualStep;
  item_name: string | null;
  feeling_text: string | null;
  farewell_text: string | null;
  photo_path: string | null;
  method: RitualMethod | null;
  status: RitualStatus;
  cooling_days: CoolingDays | null;
  cooling_until: string | null;
  cooling_prompted_at: string | null;
  released_at: string | null;
  purge_at: string | null;
  created_at: string;
}
