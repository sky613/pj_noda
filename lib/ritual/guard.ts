import { redirect } from "next/navigation";
import { currentRitual } from "./current";
import { canVisitStep, routeForRitual } from "./steps";
import type { Ritual, RitualStep } from "./types";

/** 단계 페이지 진입 가드: 허용되지 않은 단계면 올바른 경로로 보낸다 */
export async function requireStep(step: RitualStep): Promise<Ritual> {
  const ritual = await currentRitual();
  if (!ritual) redirect("/");
  if (!canVisitStep(ritual, step)) redirect(routeForRitual(ritual));
  return ritual;
}

export async function requireCooling(): Promise<Ritual> {
  const ritual = await currentRitual();
  if (!ritual) redirect("/");
  if (ritual.status !== "cooling") redirect(routeForRitual(ritual));
  return ritual;
}
