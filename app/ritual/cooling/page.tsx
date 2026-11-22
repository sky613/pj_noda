import { requireCooling } from "@/lib/ritual/guard";
import { isCoolingOver } from "@/lib/ritual/steps";
import { serverEnv } from "@/lib/env";
import { CoolingScreen } from "@/components/ritual/CoolingScreen";

export default async function CoolingPage() {
  const ritual = await requireCooling();
  return (
    <CoolingScreen
      itemName={ritual.item_name ?? ""}
      coolingUntil={ritual.cooling_until!}
      isOver={isCoolingOver(ritual)}
      prompted={Boolean(ritual.cooling_prompted_at)}
      timeUnit={serverEnv.timeUnit()}
    />
  );
}
