import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { anon, deleteUser, newUser, rpc, runToMethod } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("RLS: 본인 데이터만, 활성 행만", () => {
  let a: { id: string; client: SupabaseClient };
  let b: { id: string; client: SupabaseClient };

  beforeAll(async () => {
    a = await newUser();
    b = await newUser();
    await runToMethod(a.client);
  });
  afterAll(async () => {
    await deleteUser(a.id);
    await deleteUser(b.id);
  });

  it("다른 사용자의 의식은 보이지 않는다", async () => {
    const { data } = await b.client.from("rituals").select("*");
    expect(data).toEqual([]);
  });

  it("익명은 아무것도 읽을 수 없다", async () => {
    const { data, error } = await anon().from("rituals").select("*");
    expect(data ?? []).toEqual([]);
    expect(error === null || error).toBeTruthy();
  });

  it("클라이언트는 테이블에 직접 쓸 수 없다", async () => {
    const { error: insErr } = await a.client.from("rituals").insert({ user_id: a.id });
    expect(insErr).not.toBeNull();
    const { error: updErr, data } = await a.client.from("rituals").update({ status: "released" }).eq("user_id", a.id).select();
    expect(updErr !== null || (data ?? []).length === 0).toBe(true);
    const { error: statErr } = await a.client.from("user_stats").upsert({ user_id: a.id, released_count: 999 });
    expect(statErr).not.toBeNull();
    const { data: cfg } = await a.client.from("app_config").select("*");
    expect(cfg ?? []).toEqual([]);
  });

  it("purge 전용 함수는 사용자 권한으로 호출할 수 없다", async () => {
    await expect(rpc(a.client, "expired_rituals", { p_limit: 10 })).rejects.toThrow();
    await expect(rpc(a.client, "purge_rituals", { p_ids: [] })).rejects.toThrow();
  });

  it("다른 사람 폴더의 사진 경로는 거부된다", async () => {
    await expect(
      rpc(a.client, "save_ritual_step", { p_step: "farewell", p_payload: { photo_path: `${b.id}/x.jpg` } }),
    ).rejects.toThrow(/invalid photo_path/);
  });
});
