import { serverEnv } from "@/lib/env";

/** 3 → "3일" 또는 테스트 환경에서 "3분" */
export function durationLabel(n: number, unit: "days" | "minutes" = serverEnv.timeUnit()): string {
  return unit === "minutes" ? `${n}분` : `${n}일`;
}
