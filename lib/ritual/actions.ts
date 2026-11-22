"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { farewellSchema, feelingSchema, itemNameSchema, methodSchema, parseCooling } from "./schema";
import { routeForRitual } from "./steps";
import { getActiveRitual } from "./queries";

export type ActionState = { error?: string; ok?: boolean } | undefined;

const BUCKET = "ritual-photos";

function message(err: unknown, fallback: string): string {
  if (err instanceof z.ZodError) return err.issues[0]?.message ?? fallback;
  return fallback;
}

// ---------- 인증 ----------

export async function sendMagicLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.string().trim().email("이메일 주소를 확인해주세요.").safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { emailRedirectTo: `${site}/auth/callback`, shouldCreateUser: true },
  });
  if (error) return { error: "메일을 보내지 못했어요. 잠시 후 다시 시도해주세요." };
  redirect("/auth/sent");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/auth");
}

// ---------- 의식 ----------

export async function startRitual() {
  const supabase = await createClient();
  const existing = await getActiveRitual(supabase);
  if (existing) redirect(routeForRitual(existing)); // 원칙 4: 한 번에 하나

  const { error } = await supabase.rpc("start_ritual");
  if (error) {
    const again = await getActiveRitual(supabase);
    redirect(routeForRitual(again));
  }
  redirect("/ritual/select");
}

export async function saveSelect(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let itemName: string;
  try {
    itemName = itemNameSchema.parse(formData.get("item_name"));
  } catch (e) {
    return { error: message(e, "물건 이름을 확인해주세요.") };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ritual_step", { p_step: "select", p_payload: { item_name: itemName } });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };
  redirect("/ritual/name");
}

export async function saveName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let feeling: string;
  try {
    feeling = feelingSchema.parse(formData.get("feeling_text"));
  } catch (e) {
    return { error: message(e, "문장을 확인해주세요.") };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ritual_step", { p_step: "name", p_payload: { feeling_text: feeling } });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };
  redirect("/ritual/farewell");
}

export async function saveFarewell(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let farewell: string;
  try {
    farewell = farewellSchema.parse(formData.get("farewell_text") ?? "");
  } catch (e) {
    return { error: message(e, "문장을 확인해주세요.") };
  }
  const photoPath = String(formData.get("photo_path") ?? "").trim();
  const payload: Record<string, string | null> = { farewell_text: farewell || null };
  // 비어 있으면 기존 값 유지, "__remove__" 면 제거
  if (photoPath === "__remove__") payload.photo_path = null;
  else if (photoPath) payload.photo_path = photoPath;

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_ritual_step", { p_step: "farewell", p_payload: payload });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };
  redirect("/ritual/method");
}

export async function setMethod(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let method: "discard" | "donate" | "give";
  let cooling: 3 | 7 | null;
  try {
    method = methodSchema.parse(formData.get("method"));
    cooling = parseCooling(String(formData.get("cooling") ?? "now"));
  } catch {
    return { error: "보내는 방법을 골라주세요." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_ritual_method", { p_method: method, p_cooling_days: cooling });
  if (error) return { error: "저장하지 못했어요. 다시 시도해주세요." };
  redirect(cooling ? "/ritual/cooling" : "/ritual/release");
}

export async function releaseRitual(): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("release_ritual");
  if (error) return { error: "보내지 못했어요. 잠시 후 다시 시도해주세요." };
  // 여기서 revalidate 하지 않는다: 하면 현재 화면이 서버에서 다시 그려져 홈으로 튕기고
  // "비워지는" 애니메이션을 볼 수 없다. 클라이언트가 애니메이션 뒤에 router.refresh() 한다.
  return { ok: true };
}

export async function keepRitual() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("keep_ritual");
  if (error) redirect("/");

  const row = (Array.isArray(data) ? data[0] : data) as { id: string; photo_path: string | null } | undefined;
  if (row) {
    // 즉시 완전 삭제: 사진 → 행. 실패하면 purge 스위퍼가 곧 처리한다.
    const admin = createAdminClient();
    let photoGone = true;
    if (row.photo_path) {
      const { error: rmErr } = await admin.storage.from(BUCKET).remove([row.photo_path]);
      photoGone = !rmErr;
    }
    if (photoGone) await admin.rpc("purge_rituals", { p_ids: [row.id] });
  }
  revalidatePath("/");
  redirect("/");
}

export async function markCoolingPrompted() {
  const supabase = await createClient();
  await supabase.rpc("mark_cooling_prompted");
  revalidatePath("/ritual/cooling");
}

// ---------- 계정 ----------

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const admin = createAdminClient();
  // Storage 폴더 전체 삭제. 실패한 채 계정을 지우면 사진이 영영 남으므로 중단한다.
  const { data: files, error: listErr } = await admin.storage.from(BUCKET).list(user.id, { limit: 1000 });
  if (listErr) throw new Error("계정 삭제에 실패했어요.");
  if (files.length > 0) {
    const { error: rmErr } = await admin.storage.from(BUCKET).remove(files.map((f) => `${user.id}/${f.name}`));
    if (rmErr) throw new Error("계정 삭제에 실패했어요.");
  }
  // auth.users 삭제 → rituals · user_stats cascade
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) throw new Error("계정 삭제에 실패했어요.");
  await supabase.auth.signOut();
  redirect("/auth?farewell=1");
}
