import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  question: string;
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
}

/** 한 화면에 질문 하나. 여백이 많고 조용한 레이아웃. */
export function StepShell({ question, children, backHref, backLabel = "돌아가기" }: Props) {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-28 pt-16">
      {backHref && (
        <Link href={backHref} className="mb-10 self-start text-sm text-ink-soft underline-offset-4 hover:underline">
          ← {backLabel}
        </Link>
      )}
      <h1 className="mb-12 text-2xl leading-relaxed text-ink">{question}</h1>
      <div className="flex flex-1 flex-col gap-10">{children}</div>
    </section>
  );
}
