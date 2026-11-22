import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, deleteUser, newUser, rowById, rpc, runToMethod } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("냉각 상자 (time_unit=minutes)", () => {
  let uid: string;
  let client: SupabaseClient;

  beforeAll(async () => ({ id: uid, client } = await newUser()));
  afterAll(async () => deleteUser(uid));

  it("3분 뒤 다시 묻기 → 기간 전에는 보낼 수 없다 → 기간 후 보내기", async () => {
    const id = await runToMethod(client);
    await rpc(client, "set_ritual_method", { p_method: "donate", p_cooling_days: 3 });

    const row = (await rowById(id))!;
    expect(row.status).toBe("cooling");
    const minutes = (new Date(row.cooling_until).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(2.5);
    expect(minutes).toBeLessThanOrEqual(3.05);

    // 홈에는 활성(cooling) 행으로 보인다
    const { data: active } = await client.from("rituals").select("status");
    expect(active).toEqual([{ status: "cooling" }]);

    await expect(rpc(client, "release_ritual")).rejects.toThrow(/still cooling/);

    // 시간을 앞당긴다
    await admin().from("rituals").update({ cooling_until: new Date(Date.now() - 1000).toISOString() }).eq("id", id);
    await rpc(client, "mark_cooling_prompted");
    expect((await rowById(id))!.cooling_prompted_at).not.toBeNull();

    await rpc(client, "release_ritual");
    expect((await rowById(id))!.status).toBe("released");
    expect(await rpc(client, "released_count")).toBe(1);
  });

  it("7분 옵션", async () => {
    const id = await runToMethod(client);
    await rpc(client, "set_ritual_method", { p_method: "give", p_cooling_days: 7 });
    const row = (await rowById(id))!;
    const minutes = (new Date(row.cooling_until).getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(6.5);
    expect(minutes).toBeLessThanOrEqual(7.05);
    await rpc(client, "keep_ritual");
    await admin().from("rituals").delete().eq("id", id);
  });

  it("다시 간직하기: kept → 즉시 purge 대상, 카운트 변화 없음", async () => {
    const before = await rpc<number>(client, "released_count");
    const id = await runToMethod(client);
    await rpc(client, "set_ritual_method", { p_method: "discard", p_cooling_days: 3 });

    const kept = await rpc<{ id: string; photo_path: string | null }[]>(client, "keep_ritual");
    expect(kept[0].id).toBe(id);

    // 본인에게 더 이상 보이지 않는다
    const { data } = await client.from("rituals").select("*");
    expect(data).toEqual([]);

    // 서버 액션과 같은 절차: 즉시 purge
    const purged = await rpc<number>(admin(), "purge_rituals", { p_ids: [id] });
    expect(purged).toBe(1);
    expect(await rowById(id)).toBeNull();
    expect(await rpc(client, "released_count")).toBe(before);
  });
});
