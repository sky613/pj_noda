import { disposalGuide } from "@/lib/content/disposal-guide";

export function DisposalGuide() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ink-soft">물건 종류에 맞는 방법을 펼쳐보세요.</p>
      {disposalGuide.map((c) => (
        <details key={c.id} className="group rounded-xl border border-line px-4 py-3">
          <summary className="cursor-pointer list-none text-base text-ink">
            <span className="mr-2 inline-block transition-transform duration-300 group-open:rotate-90" aria-hidden>›</span>
            {c.title}
            <span className="ml-2 text-sm text-ink-soft">{c.examples}</span>
          </summary>
          <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-sm leading-relaxed text-ink-soft">
            {c.how.map((h, i) => <li key={i}>{h}</li>)}
          </ol>
        </details>
      ))}
    </div>
  );
}
