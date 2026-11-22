import { describe, expect, it } from "vitest";
import { detectSafety } from "@/lib/safety/detect";
import { safetyKeywords } from "@/lib/safety/keywords";

describe("detectSafety", () => {
  it("아무것도 감지하지 않는다", () => {
    expect(detectSafety(["오래된 코트", "작아져서 못 입는데 아깝다"])).toEqual({ heavy: false, crisis: false });
    expect(detectSafety([null, undefined, ""])).toEqual({ heavy: false, crisis: false });
  });

  it("유품·사별 키워드를 감지한다 (공백 무시)", () => {
    expect(detectSafety(["엄마의 스웨터", null]).heavy).toBe(true);
    expect(detectSafety(["돌아가 신 아버지 시계"]).heavy).toBe(true);
    expect(detectSafety(["낡은 상자", "할머니 유 품이다"]).heavy).toBe(true);
  });

  it("위기 표현을 감지한다", () => {
    expect(detectSafety(["일기장", "이걸 보면 죽고 싶다"]).crisis).toBe(true);
    expect(detectSafety(["칼", "자해하던 기억"]).crisis).toBe(true);
    expect(detectSafety(["칼", "요리할 때 쓰던 것"]).crisis).toBe(false);
  });

  it("설정 파일에 상담 연락처가 있다", () => {
    expect(safetyKeywords.contacts.map((c) => c.number)).toEqual(expect.arrayContaining(["109", "1577-0199"]));
  });

  it("키워드 목록을 바꿔 끼울 수 있다", () => {
    const custom = { heavy: ["테스트무거움"], crisis: ["테스트위기"], contacts: [] };
    expect(detectSafety(["테스트무거움"], custom)).toEqual({ heavy: true, crisis: false });
    expect(detectSafety(["엄마의"], custom).heavy).toBe(false);
  });
});
