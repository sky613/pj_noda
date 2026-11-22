import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

// service role. 계정 삭제·즉시 삭제(kept) 전용. 조회 용도로 쓰지 않는다.
export function createAdminClient() {
  return createSupabaseClient(serverEnv.supabaseServerUrl(), serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
