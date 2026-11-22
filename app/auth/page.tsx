import { AuthForm } from "@/components/home/AuthForm";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ farewell?: string; error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-24">
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink-soft">놓다</p>
          <h1 className="text-3xl leading-relaxed">마음은 다스리는 것이 아니라, 버리는 것입니다.</h1>
        </div>
        {params.farewell && <p className="text-base text-ink-soft">모든 기록을 지웠어요. 잘 지내시길.</p>}
        {params.error && <p role="alert" className="text-base text-accent">링크가 만료되었거나 올바르지 않아요. 다시 받아주세요.</p>}
        <AuthForm />
      </div>
    </main>
  );
}
