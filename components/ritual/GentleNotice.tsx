/** 무거운 물건(유품·사별) 감지 시 한 번 보여주는 부드러운 안내 */
export function GentleNotice() {
  return (
    <p role="note" className="rounded-xl bg-bg-soft px-5 py-4 text-base leading-relaxed text-ink-soft">
      소중한 사람과 이어진 물건인 것 같아요. 서두르지 않아도 괜찮아요.
      며칠 곁에 두고, 그때도 같은 마음이면 보내도 늦지 않아요.
    </p>
  );
}
