import { z } from "zod";

export const LIMITS = { itemName: 30, feeling: 100, farewell: 100 } as const;

export const itemNameSchema = z.string().trim().min(1, "물건 이름을 적어주세요.").max(LIMITS.itemName, `${LIMITS.itemName}자 이내로 적어주세요.`);
export const feelingSchema = z.string().trim().min(1, "한 문장이면 충분해요.").max(LIMITS.feeling, `${LIMITS.feeling}자 이내로 적어주세요.`);
export const farewellSchema = z.string().trim().max(LIMITS.farewell, `${LIMITS.farewell}자 이내로 적어주세요.`);
export const methodSchema = z.enum(["discard", "donate", "give"]);
export const coolingSchema = z.union([z.literal("now"), z.literal("3"), z.literal("7")]);

export function parseCooling(value: string): 3 | 7 | null {
  const v = coolingSchema.parse(value);
  return v === "now" ? null : (Number(v) as 3 | 7);
}
