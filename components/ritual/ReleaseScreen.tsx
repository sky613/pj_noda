"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { releaseRitual } from "@/lib/ritual/actions";
import { Button } from "@/components/ui/Button";

interface Props {
  itemName: string;
  methodVerb: string;
  backHref: string;
}

type Phase = "confirm" | "emptying" | "done";

const EMPTY_MS = 2500;

export function ReleaseScreen({ itemName, methodVerb, backHref }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onRelease() {
    setPending(true);
    setError(null);
    const result = await releaseRitual();
    if (!result?.ok) {
      setError(result?.error ?? "보내지 못했어요.");
      setPending(false);
      return;
    }
    setPhase("emptying");
  }

  useEffect(() => {
    if (phase !== "emptying") return;
    const t = setTimeout(() => setPhase("done"), EMPTY_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "done") {
    return (
      <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6">
        <p className="animate-fade-in text-2xl" aria-live="polite">보냈습니다.</p>
        <button
          type="button"
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
          className="mt-16 text-sm text-ink-soft underline-offset-4 hover:underline"
        >
          돌아가기
        </button>
      </section>
    );
  }

  return (
    <section
      className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-28 pt-16 ${phase === "emptying" ? "animate-empty-out pointer-events-none" : ""}`}
      aria-busy={phase === "emptying"}
    >
      <Link href={backHref} className="mb-10 self-start text-sm text-ink-soft underline-offset-4 hover:underline">← 돌아가기</Link>
      <h1 className="mb-6 text-2xl leading-relaxed">실제로 {methodVerb} 나서 눌러주세요.</h1>
      <p className="mb-12 text-base text-ink-soft">{itemName}</p>
      <div className="flex flex-1 flex-col justify-end gap-4">
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        <Button type="button" onClick={onRelease} disabled={pending} className="self-start">
          보냈어요
        </Button>
      </div>
    </section>
  );
}
