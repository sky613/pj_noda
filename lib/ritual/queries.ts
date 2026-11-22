import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ritual } from "./types";

/**
 * 진행 중·냉각 중인 의식 1건. RLS가 released/kept 행을 숨기므로
 * 이 함수가 유일한 조회 경로이며 과거 의식은 어떤 경로로도 읽히지 않는다.
 */
export async function getActiveRitual(supabase: SupabaseClient): Promise<Ritual | null> {
  const { data, error } = await supabase.from("rituals").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return (data as Ritual | null) ?? null;
}

export async function getReleasedCount(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase.rpc("released_count");
  if (error) throw error;
  return (data as number) ?? 0;
}
