import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...(process.env as Record<string, string>) };
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) env[m[1]] = m[2];
    }
  } catch {
    /* .env.local 없음 → process.env 사용 */
  }
  return env;
}

export const env = loadEnv();
export const URL = env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
export const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY!;
export const BUCKET = "ritual-photos";

export function admin(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function anon(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** 테스트 사용자 생성 + 로그인된 클라이언트. 비밀번호 로그인은 테스트 전용. */
export async function newUser(): Promise<{ id: string; client: SupabaseClient; email: string }> {
  const email = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "test-pass-1234";
  const a = admin();
  const { data, error } = await a.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const client = anon();
  const { error: signErr } = await client.auth.signInWithPassword({ email, password });
  if (signErr) throw signErr;
  return { id: data.user!.id, client, email };
}

export async function deleteUser(id: string) {
  await admin().auth.admin.deleteUser(id);
}

/** 1~3단계 + 방법 선택까지 진행한 의식 */
export async function runToMethod(client: SupabaseClient, opts: { photoPath?: string; itemName?: string } = {}) {
  const { data: id, error } = await client.rpc("start_ritual");
  if (error) throw error;
  await rpc(client, "save_ritual_step", { p_step: "select", p_payload: { item_name: opts.itemName ?? "낡은 코트" } });
  await rpc(client, "save_ritual_step", { p_step: "name", p_payload: { feeling_text: "작아졌는데 버리기 아깝다" } });
  await rpc(client, "save_ritual_step", {
    p_step: "farewell",
    p_payload: { farewell_text: "고마웠어", ...(opts.photoPath ? { photo_path: opts.photoPath } : {}) },
  });
  return id as string;
}

export async function rpc<T = unknown>(client: SupabaseClient, fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export async function invokePurge(): Promise<{ ok: boolean; scanned: number; purged: number; failed: number }> {
  const res = await fetch(`${URL}/functions/v1/purge-expired`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: "{}",
  });
  return res.json();
}

export async function rowById(id: string) {
  const { data } = await admin().from("rituals").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function objectExists(path: string): Promise<boolean> {
  const [folder, name] = path.split("/");
  const { data } = await admin().storage.from(BUCKET).list(folder, { search: name });
  return Boolean(data?.some((f) => f.name === name));
}

export const tinyJpeg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z",
  "base64",
);
