/** 페이지 전환마다 다시 마운트되어 느린 페이드(500ms)를 준다 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
