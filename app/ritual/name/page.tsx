import { requireStep } from "@/lib/ritual/guard";
import { StepShell } from "@/components/ritual/StepShell";
import { NameForm } from "@/components/ritual/forms";

export default async function NamePage() {
  const ritual = await requireStep("name");
  return (
    <StepShell question="이 물건에 붙어 있는 마음을 한 문장으로 적어보세요." backHref="/ritual/select">
      <p className="-mt-6 text-base text-ink-soft">{ritual.item_name}</p>
      <NameForm defaultValue={ritual.feeling_text} />
    </StepShell>
  );
}
