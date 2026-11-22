// purge-expired: released 후 purge_at이 지난 행과 kept 행을 사진과 함께 하드 삭제한다.
// 호출: pg_cron(pg_net) 또는 테스트. service role Bearer 토큰 필수.
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "ritual-photos";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("method not allowed", { status: 405 });
  }
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rows, error } = await supabase.rpc("expired_rituals", { p_limit: 200 });
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const purgeable: string[] = [];
  const failed: string[] = [];

  for (const row of rows ?? []) {
    if (row.photo_path) {
      // 사진을 먼저 지운다. 실패하면 행을 남겨 다음 주기에 재시도한다.
      const { error: rmErr } = await supabase.storage.from(BUCKET).remove([row.photo_path]);
      if (rmErr) {
        failed.push(row.id);
        continue;
      }
    }
    purgeable.push(row.id);
  }

  let purged = 0;
  if (purgeable.length > 0) {
    const { data, error: delErr } = await supabase.rpc("purge_rituals", { p_ids: purgeable });
    if (delErr) {
      return Response.json({ ok: false, error: delErr.message, failed }, { status: 500 });
    }
    purged = data ?? 0;
  }

  // 내용(이름·문장)은 절대 로그에 남기지 않는다. 개수만.
  console.log(`purge-expired: scanned=${rows?.length ?? 0} purged=${purged} failed=${failed.length}`);
  return Response.json({ ok: true, scanned: rows?.length ?? 0, purged, failed: failed.length });
});
