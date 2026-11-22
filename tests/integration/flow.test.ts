import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, deleteUser, newUser, rowById, rpc, runToMethod } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("의식 1~5단계", () => {
  let uid: string;
  let client: SupabaseClient;

  beforeAll(async () => ({ id: uid, client } = await newUser()));
  afterAll(async () => deleteUser(uid));

  it("시작 → 고르기 → 이름 붙이기 → 작별 → 방법 → 보내기", async () => {
    const id = await runToMethod(client);

    // 활성 의식은 본인에게 1건 보인다
    const { data: active } = await client.from("rituals").select("*");
    expect(active).toHaveLength(1);
    expect(active![0].step).toBe("method");

    await rpc(client, "set_ritual_method", { p_method: "discard", p_cooling_days: null });
    expect((await rowById(id))!.step).toBe("release");
    expect(await rpc(client, "released_count")).toBe(0);

    await rpc(client, "release_ritual");

    // 카운트 +1
    expect(await rpc(client, "released_count")).toBe(1);

    // 원칙 2: released 행은 본인에게도 보이지 않는다
    const { data: after } = await client.from("rituals").select("*");
    expect(after).toEqual([]);

    // purge_at = released_at + 7 단위(분)
    const row = (await rowById(id))!;
    expect(row.status).toBe("released");
    const diffMin = (new Date(row.purge_at).getTime() - new Date(row.released_at).getTime()) / 60_000;
    expect(diffMin).toBeCloseTo(7, 1);
  });

  it("원칙 4: 의식이 끝나기 전에는 새 의식을 시작할 수 없다", async () => {
    await rpc(client, "start_ritual");
    await expect(rpc(client, "start_ritual")).rejects.toThrow(/already in progress/);
    // 정리
    await rpc(client, "keep_ritual");
    await admin().from("rituals").delete().eq("user_id", uid);
  });

  it("앞 단계를 건너뛸 수 없다", async () => {
    await rpc(client, "start_ritual");
    await expect(rpc(client, "save_ritual_step", { p_step: "name", p_payload: { feeling_text: "x" } })).rejects.toThrow(/item_name required/);
    await expect(rpc(client, "set_ritual_method", { p_method: "donate", p_cooling_days: null })).rejects.toThrow(/not ready/);
    await rpc(client, "keep_ritual");
    await admin().from("rituals").delete().eq("user_id", uid);
  });

  it("길이 제한을 DB가 강제한다", async () => {
    await rpc(client, "start_ritual");
    await expect(rpc(client, "save_ritual_step", { p_step: "select", p_payload: { item_name: "가".repeat(31) } })).rejects.toThrow();
    await rpc(client, "keep_ritual");
    await admin().from("rituals").delete().eq("user_id", uid);
  });
});
