"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { keepRitual, markCoolingPrompted } from "@/lib/ritual/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  itemName: string;
  coolingUntil: string;
  isOver: boolean;
  prompted: boolean;
  timeUnit: "days" | "minutes";
}

function formatUntil(iso: string, unit: "days" | "minutes") {
  const d = new Date(iso);
  return unit === "minutes"
    ? d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

export function CoolingScreen({ itemName, coolingUntil, isOver, prompted, timeUnit }: Props) {
  const [revealed, setRevealed] = useState(false);

  // 기간이 끝나고 처음 들어왔을 때 1회 알림 기록
  useEffect(() => {
    if (isOver && !prompted) void markCoolingPrompted();
  }, [isOver, prompted]);

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-28 pt-16">
      <Link href="/" className="mb-10 self-start text-sm text-ink-soft underline-offset-4 hover:underline">← 홈으로</Link>

      {!isOver ? (
        <>
          <h1 className="mb-6 text-2xl leading-relaxed">보관 중인 물건이 하나 있어요.</h1>
          <p className="mb-12 text-base text-ink-soft">{formatUntil(coolingUntil, timeUnit)}에 다시 물어볼게요.</p>
          {revealed ? (
            <p className="text-xl animate-fade-in" aria-live="polite">{itemName}</p>
          ) : (
            <button type="button" onClick={() => setRevealed(true)} className="self-start text-base text-ink-soft underline-offset-4 hover:underline">
              무엇이었는지 보기
            </button>
          )}
        </>
      ) : (
        <>
          <h1 className="mb-6 text-2xl leading-relaxed">아직 보내고 싶으신가요?</h1>
          <p className="mb-12 text-xl">{itemName}</p>
          <div className="flex flex-1 flex-col justify-end gap-4">
            <Link
              href="/ritual/release"
              className="inline-flex min-h-12 items-center self-start rounded-xl bg-accent px-6 text-base text-accent-ink transition-opacity duration-300 hover:opacity-90"
            >
              보내기
            </Link>
            <form action={keepRitual}>
              <Button type="submit" variant="ghost">다시 간직하기</Button>
            </form>
            <p className="text-xs text-ink-soft">다시 간직하면 적어둔 내용과 사진은 지금 바로 지워져요.</p>
          </div>
        </>
      )}
    </section>
  );
}
