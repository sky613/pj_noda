import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveRitual } from "./queries";

/** 요청 1회당 활성 의식 조회를 한 번만 수행 */
export const currentRitual = cache(async () => {
  const supabase = await createClient();
  return getActiveRitual(supabase);
});
