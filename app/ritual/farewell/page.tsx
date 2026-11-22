import { requireStep } from "@/lib/ritual/guard";
import { createClient } from "@/lib/supabase/server";
import { StepShell } from "@/components/ritual/StepShell";
import { FarewellForm } from "@/components/ritual/forms";

export default async function FarewellPage() {
  const ritual = await requireStep("farewell");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <StepShell question="작별할 시간이에요." backHref="/ritual/name">
      <p className="-mt-6 text-base text-ink-soft">원하면 사진 한 장과 마지막 한 마디를 남길 수 있어요. 둘 다 건너뛰어도 괜찮아요.</p>
      <FarewellForm
        ritualId={ritual.id}
        userId={user!.id}
        defaultText={ritual.farewell_text}
        existingPhotoPath={ritual.photo_path}
      />
    </StepShell>
  );
}
