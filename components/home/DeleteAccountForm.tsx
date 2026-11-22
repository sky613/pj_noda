"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function DeleteAccountForm({ action }: { action: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="flex flex-col gap-4 border-t border-line pt-8">
      <p className="text-base text-ink-soft">
        계정을 지우면 보낸 물건 수를 포함한 모든 기록이 지금 바로 완전히 사라져요.
      </p>
      {!confirming ? (
        <Button type="button" variant="quiet" className="self-start px-0" onClick={() => setConfirming(true)}>
          계정과 모든 기록 지우기
        </Button>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <p className="text-base">정말 지울까요? 되돌릴 수 없어요.</p>
          <div className="flex gap-3">
            <Button type="submit">지우기</Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>그대로 두기</Button>
          </div>
        </form>
      )}
    </div>
  );
}
