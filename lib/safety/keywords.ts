import raw from "@/config/safety-keywords.json";

export interface SafetyContact { name: string; number: string }
export interface SafetyKeywords { heavy: string[]; crisis: string[]; contacts: SafetyContact[] }

export const safetyKeywords: SafetyKeywords = {
  heavy: raw.heavy,
  crisis: raw.crisis,
  contacts: raw.contacts,
};
