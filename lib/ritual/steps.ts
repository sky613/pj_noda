import type { Ritual, RitualStep } from "./types";

export const STEP_ORDER: RitualStep[] = ["select", "name", "farewell", "method", "release"];

export const STEP_PATH: Record<RitualStep, string> = {
  select: "/ritual/select",
  name: "/ritual/name",
  farewell: "/ritual/farewell",
  method: "/ritual/method",
  release: "/ritual/release",
};

export const COOLING_PATH = "/ritual/cooling";

/** 활성 의식이 지금 머물러야 하는 경로 */
export function routeForRitual(ritual: Pick<Ritual, "status" | "step" | "cooling_until"> | null, now = new Date()): string {
  if (!ritual) return "/";
  if (ritual.status === "cooling") {
    // 기간이 끝났어도 "다시 묻기"는 냉각 화면에서 진행한다
    return COOLING_PATH;
  }
  if (ritual.status !== "in_progress") return "/";
  return STEP_PATH[ritual.step];
}

/** 요청한 단계에 머물 수 있는가 (뒤로 가서 수정하는 것은 허용, 앞서가는 것은 불가) */
export function canVisitStep(ritual: Pick<Ritual, "status" | "step">, requested: RitualStep): boolean {
  if (ritual.status !== "in_progress") return false;
  return STEP_ORDER.indexOf(requested) <= STEP_ORDER.indexOf(ritual.step);
}

export function isCoolingOver(ritual: Pick<Ritual, "status" | "cooling_until">, now = new Date()): boolean {
  if (ritual.status !== "cooling" || !ritual.cooling_until) return false;
  return new Date(ritual.cooling_until).getTime() <= now.getTime();
}
