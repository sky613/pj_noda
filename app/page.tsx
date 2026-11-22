import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveRitual, getReleasedCount } from "@/lib/ritual/queries";
import { routeForRitual, isCoolingOver } from "@/lib/ritual/steps";
import { startRitual } from "@/lib/ritual/actions";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const [ritual, count] = await Promise.all([getActiveRitual(supabase), getReleasedCount(supabase)]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-24">
      <div className="flex flex-1 flex-col items-start justify-center gap-10">
        {!ritual && (
          <>
            <h1 className="text-3xl leading-relaxed">보낼 것이 있나요?</h1>
            <form action={startRitual}>
              <Button type="submit">시작하기</Button>
            </form>
          </>
        )}

        {ritual?.status === "in_progress" && (
          <>
            <h1 className="text-3xl leading-relaxed">하던 의식이 있어요.</h1>
            <Link
              href={routeForRitual(ritual)}
              className="inline-flex min-h-12 items-center rounded-xl bg-accent px-6 text-base text-accent-ink transition-opacity duration-300 hover:opacity-90"
            >
              이어서
            </Link>
          </>
        )}

        {ritual?.status === "cooling" && (
          <>
            <h1 className="text-3xl leading-relaxed">
              {isCoolingOver(ritual) ? "다시 물을 때가 되었어요." : "보관 중인 물건이 하나 있어요."}
            </h1>
            <Link
              href="/ritual/cooling"
              className="inline-flex min-h-12 items-center rounded-xl border border-line px-6 text-base text-ink transition-colors duration-300 hover:bg-bg-soft"
            >
              {isCoolingOver(ritual) ? "들여다보기" : "상자 열어보기"}
            </Link>
          </>
        )}
      </div>

      <footer className="flex items-end justify-between text-sm text-ink-soft">
        <p>지금까지 보낸 물건 {count}개</p>
        <Link href="/account" className="text-xs underline-offset-4 hover:underline">계정</Link>
      </footer>
    </main>
  );
}
