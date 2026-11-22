import { safetyKeywords, type SafetyKeywords } from "./keywords";

export interface SafetyResult {
  heavy: boolean;
  crisis: boolean;
}

function normalize(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

/**
 * 순수 함수. 입력 텍스트를 저장·로그·전송하지 않는다.
 * 공백을 제거한 뒤 부분 문자열로 비교한다.
 */
export function detectSafety(texts: Array<string | null | undefined>, keywords: SafetyKeywords = safetyKeywords): SafetyResult {
  const joined = normalize(texts.filter((t): t is string => typeof t === "string" && t.length > 0).join("\n"));
  if (!joined) return { heavy: false, crisis: false };
  const hit = (list: string[]) => list.some((k) => joined.includes(normalize(k)));
  return { heavy: hit(keywords.heavy), crisis: hit(keywords.crisis) };
}
