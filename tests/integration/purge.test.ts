import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, BUCKET, deleteUser, invokePurge, newUser, objectExists, rowById, rpc, runToMethod, tinyJpeg } from "./helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

describe("원칙 1: purge_at이 지나면 행과 사진이 사라진다", () => {
  let uid: string;
  let client: SupabaseClient;

  beforeAll(async () => ({ id: uid, client } = await newUser()));
  afterAll(async () => deleteUser(uid));

  it("released + 만료 → Edge Function → DB 행과 Storage 객체 삭제", async () => {
    const { data: started } = await client.rpc("start_ritual");
    const id = started as string;
    const photoPath = `${uid}/${id}.jpg`;

    // 사용자 권한으로 본인 폴더에 사진 업로드
    const { error: upErr } = await client.storage.from(BUCKET).upload(photoPath, tinyJpeg, { contentType: "image/jpeg", upsert: true });
    expect(upErr).toBeNull();
    expect(await objectExists(photoPath)).toBe(true);

    await rpc(client, "save_ritual_step", { p_step: "select", p_payload: { item_name: "사진 있는 물건" } });
    await rpc(client, "save_ritual_step", { p_step: "name", p_payload: { feeling_text: "마음" } });
    await rpc(client, "save_ritual_step", { p_step: "farewell", p_payload: { farewell_text: null, photo_path: photoPath } });
    await rpc(client, "set_ritual_method", { p_method: "discard", p_cooling_days: null });
    await rpc(client, "release_ritual");

    // 아직 만료 전: purge는 아무것도 지우지 않는다
    const first = await invokePurge();
    expect(first.ok).toBe(true);
    expect(await rowById(id)).not.toBeNull();
    expect(await objectExists(photoPath)).toBe(true);

    // purge_at을 과거로
    await admin().from("rituals").update({ purge_at: new Date(Date.now() - 1000).toISOString() }).eq("id", id);

    const second = await invokePurge();
    expect(second.ok).toBe(true);
    expect(second.purged).toBeGreaterThanOrEqual(1);
    expect(second.failed).toBe(0);

    expect(await rowById(id)).toBeNull();
    expect(await objectExists(photoPath)).toBe(false);

    // 카운트는 남는다 (숫자만)
    expect(await rpc(client, "released_count")).toBe(1);
  });

  it("다른 사용자 폴더의 사진에는 접근할 수 없다", async () => {
    const other = await newUser();
    const { error } = await client.storage.from(BUCKET).upload(`${other.id}/evil.jpg`, tinyJpeg, { contentType: "image/jpeg" });
    expect(error).not.toBeNull();
    await deleteUser(other.id);
  });

  it("계정 삭제 시 모든 데이터가 즉시 사라진다", async () => {
    const victim = await newUser();
    const id = await runToMethod(victim.client, { photoPath: undefined });
    await rpc(victim.client, "set_ritual_method", { p_method: "donate", p_cooling_days: 7 });
    await deleteUser(victim.id);
    expect(await rowById(id)).toBeNull();
    const { data: stats } = await admin().from("user_stats").select("*").eq("user_id", victim.id);
    expect(stats).toEqual([]);
  });
});
