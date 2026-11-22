import { describe, expect, it } from "vitest";
import { itemNameSchema, feelingSchema, farewellSchema, parseCooling } from "@/lib/ritual/schema";

describe("입력 검증", () => {
  it("물건 이름 1~30자", () => {
    expect(itemNameSchema.parse("  코트 ")).toBe("코트");
    expect(() => itemNameSchema.parse("")).toThrow();
    expect(() => itemNameSchema.parse("가".repeat(31))).toThrow();
  });
  it("감정 문장 1~100자, 마지막 한 마디 0~100자", () => {
    expect(feelingSchema.parse("가".repeat(100))).toHaveLength(100);
    expect(() => feelingSchema.parse("가".repeat(101))).toThrow();
    expect(farewellSchema.parse("")).toBe("");
  });
  it("냉각 옵션", () => {
    expect(parseCooling("now")).toBeNull();
    expect(parseCooling("3")).toBe(3);
    expect(parseCooling("7")).toBe(7);
    expect(() => parseCooling("30")).toThrow();
  });
});
