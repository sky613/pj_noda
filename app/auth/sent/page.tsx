export default function SentPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-24">
      <div className="flex flex-1 flex-col justify-center gap-4">
        <h1 className="text-3xl leading-relaxed">메일을 보냈어요.</h1>
        <p className="text-base text-ink-soft">받은 메일의 링크를 누르면 들어올 수 있어요. 천천히 오셔도 괜찮아요.</p>
      </div>
    </main>
  );
}
