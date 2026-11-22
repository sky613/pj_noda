"use client";
import { useActionState } from "react";
import { sendMagicLink } from "@/lib/ritual/actions";
import { Button } from "@/components/ui/Button";

export function AuthForm() {
  const [state, action, pending] = useActionState(sendMagicLink, undefined);
  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-base text-ink-soft">이메일로 들어올 수 있어요.</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-describedby={state?.error ? "email-error" : undefined}
          aria-invalid={state?.error ? true : undefined}
          className="min-h-12 w-full border-b border-line bg-transparent px-1 py-2 text-xl outline-none focus:border-accent"
        />
        {state?.error && <p id="email-error" role="alert" className="text-sm text-accent">{state.error}</p>}
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "보내는 중" : "링크 받기"}
      </Button>
    </form>
  );
}
