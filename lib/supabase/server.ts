import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv, serverEnv } from "@/lib/env";

// RSC · Server Action 용. 사용자 세션(쿠키) 기반 → RLS 적용.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(serverEnv.supabaseServerUrl(), publicEnv.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // RSC 렌더링 중에는 쿠키를 쓸 수 없다. middleware가 세션을 갱신한다.
        }
      },
    },
  });
}
