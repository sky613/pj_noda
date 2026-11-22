"use client";
import { useActionState } from "react";
import { saveSelect, saveName, saveFarewell } from "@/lib/ritual/actions";
import { LIMITS } from "@/lib/ritual/schema";
import { TextField, TextArea } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { PhotoPicker } from "./PhotoPicker";

export function SelectForm({ defaultValue }: { defaultValue: string | null }) {
  const [state, action, pending] = useActionState(saveSelect, undefined);
  return (
    <form action={action} className="flex flex-1 flex-col justify-between gap-10">
      <TextField
        name="item_name"
        label="물건 이름"
        hint="예: 오래된 편지, 입지 않는 코트"
        maxLength={LIMITS.itemName}
        defaultValue={defaultValue}
        error={state?.error}
        required
        autoFocus
        autoComplete="off"
      />
      <Button type="submit" disabled={pending} className="self-start">이어서</Button>
    </form>
  );
}

export function NameForm({ defaultValue }: { defaultValue: string | null }) {
  const [state, action, pending] = useActionState(saveName, undefined);
  return (
    <form action={action} className="flex flex-1 flex-col justify-between gap-10">
      <TextArea
        name="feeling_text"
        label="붙어 있는 마음"
        hint="잘 쓰려 하지 않아도 괜찮아요."
        maxLength={LIMITS.feeling}
        defaultValue={defaultValue}
        error={state?.error}
        required
        autoFocus
      />
      <Button type="submit" disabled={pending} className="self-start">이어서</Button>
    </form>
  );
}

export function FarewellForm({
  ritualId,
  userId,
  defaultText,
  existingPhotoPath,
}: {
  ritualId: string;
  userId: string;
  defaultText: string | null;
  existingPhotoPath: string | null;
}) {
  const [state, action, pending] = useActionState(saveFarewell, undefined);
  return (
    <form action={action} className="flex flex-1 flex-col justify-between gap-10">
      <div className="flex flex-col gap-10">
        <PhotoPicker ritualId={ritualId} userId={userId} existingPath={existingPhotoPath} />
        <TextArea
          name="farewell_text"
          label="마지막 한 마디 (선택)"
          maxLength={LIMITS.farewell}
          defaultValue={defaultText}
          error={state?.error}
        />
      </div>
      <Button type="submit" disabled={pending} className="self-start">이어서</Button>
    </form>
  );
}
