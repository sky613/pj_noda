import { describe, expect, it } from "vitest";
import { canVisitStep, isCoolingOver, routeForRitual } from "@/lib/ritual/steps";

const base = { status: "in_progress" as const, step: "farewell" as const, cooling_until: null };

describe("routeForRitual", () => {
  it("활성 의식이 없으면 홈", () => expect(routeForRitual(null)).toBe("/"));
  it("진행 중이면 현재 단계 경로", () => expect(routeForRitual(base)).toBe("/ritual/farewell"));
  it("냉각 중이면 냉각 화면 (기간이 끝나도)", () => {
    expect(routeForRitual({ status: "cooling", step: "release", cooling_until: "2999-01-01T00:00:00Z" })).toBe("/ritual/cooling");
    expect(routeForRitual({ status: "cooling", step: "release", cooling_until: "2000-01-01T00:00:00Z" })).toBe("/ritual/cooling");
  });
});

describe("canVisitStep", () => {
  it("현재 단계 이하만 방문 가능", () => {
    expect(canVisitStep(base, "select")).toBe(true);
    expect(canVisitStep(base, "farewell")).toBe(true);
    expect(canVisitStep(base, "method")).toBe(false);
  });
  it("진행 중이 아니면 어떤 단계도 불가", () => {
    expect(canVisitStep({ status: "cooling", step: "release" }, "select")).toBe(false);
  });
});

describe("isCoolingOver", () => {
  it("cooling_until이 지났을 때만 true", () => {
    const now = new Date("2026-10-17T12:00:00Z");
    expect(isCoolingOver({ status: "cooling", cooling_until: "2026-10-17T11:59:59Z" }, now)).toBe(true);
    expect(isCoolingOver({ status: "cooling", cooling_until: "2026-10-17T12:00:01Z" }, now)).toBe(false);
    expect(isCoolingOver({ status: "in_progress", cooling_until: "2000-01-01T00:00:00Z" }, now)).toBe(false);
  });
});
