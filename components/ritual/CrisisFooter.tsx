import { safetyKeywords } from "@/lib/safety/keywords";

/** 위기 표현 감지 시 하단에 조용히 노출. 의식은 그대로 계속된다. */
export function CrisisFooter() {
  return (
    <aside
      aria-label="상담 연락처"
      className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 px-6 py-3 text-sm text-ink-soft backdrop-blur"
    >
      <p className="mx-auto max-w-md">
        혼자 견디기 힘든 마음이라면, 이야기를 들어줄 곳이 있어요.{" "}
        {safetyKeywords.contacts.map((c, i) => (
          <span key={c.number}>
            {i > 0 && " · "}
            {c.name}{" "}
            <a href={`tel:${c.number.replace(/-/g, "")}`} className="text-ink underline underline-offset-4">
              {c.number}
            </a>
          </span>
        ))}
      </p>
    </aside>
  );
}
