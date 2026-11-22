import { requireStep } from "@/lib/ritual/guard";
import { detectSafety } from "@/lib/safety/detect";
import { serverEnv } from "@/lib/env";
import { StepShell } from "@/components/ritual/StepShell";
import { GentleNotice } from "@/components/ritual/GentleNotice";
import { MethodForm } from "@/components/ritual/MethodForm";

export default async function MethodPage() {
  const ritual = await requireStep("method");
  const safety = detectSafety([ritual.item_name, ritual.feeling_text, ritual.farewell_text]);
  return (
    <StepShell question="어떻게 보낼까요?" backHref="/ritual/farewell">
      {safety.heavy && <GentleNotice />}
      <MethodForm
        defaultMethod={ritual.method}
        defaultCooling={safety.heavy ? "7" : "now"}
        timeUnit={serverEnv.timeUnit()}
      />
    </StepShell>
  );
}
