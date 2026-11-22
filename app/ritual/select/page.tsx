import { requireStep } from "@/lib/ritual/guard";
import { StepShell } from "@/components/ritual/StepShell";
import { SelectForm } from "@/components/ritual/forms";

export default async function SelectPage() {
  const ritual = await requireStep("select");
  return (
    <StepShell question="요즘 마음에 걸리는 물건이 있나요?" backHref="/" backLabel="홈으로">
      <SelectForm defaultValue={ritual.item_name} />
    </StepShell>
  );
}
