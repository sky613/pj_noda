import Link from "next/link";
import { signOut, deleteAccount } from "@/lib/ritual/actions";
import { Button } from "@/components/ui/Button";
import { DeleteAccountForm } from "@/components/home/DeleteAccountForm";

export default function AccountPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-16">
      <Link href="/" className="mb-10 self-start text-sm text-ink-soft underline-offset-4 hover:underline">← 홈으로</Link>
      <h1 className="mb-12 text-2xl leading-relaxed">계정</h1>
      <div className="flex flex-col gap-12">
        <form action={signOut}>
          <Button type="submit" variant="ghost">나가기</Button>
        </form>
        <DeleteAccountForm action={deleteAccount} />
      </div>
    </main>
  );
}
