"use client";
import { useActionState, useState } from "react";
import { setMethod } from "@/lib/ritual/actions";
import type { RitualMethod } from "@/lib/ritual/types";
import { Button } from "@/components/ui/Button";
import { DisposalGuide } from "./DisposalGuide";

const METHODS: { value: RitualMethod; label: string; desc: string }[] = [
  { value: "discard", label: "버리기", desc: "쓰임을 다한 물건을 보냅니다." },
  { value: "donate", label: "기부하기", desc: "필요한 곳으로 보냅니다." },
  { value: "give", label: "나눠주기", desc: "아는 사람에게 건넵니다." },
];

interface Props {
  defaultMethod: RitualMethod | null;
  defaultCooling: "now" | "3" | "7";
  timeUnit: "days" | "minutes";
}

export function MethodForm({ defaultMethod, defaultCooling, timeUnit }: Props) {
  const [state, action, pending] = useActionState(setMethod, undefined);
  const [method, setMethodValue] = useState<RitualMethod | null>(defaultMethod);
  const unit = timeUnit === "minutes" ? "분" : "일";

  const COOLINGS = [
    { value: "now", label: "바로 보내기", desc: "오늘 보냅니다." },
    { value: "3", label: `${3}${unit} 뒤에 다시 묻기`, desc: "잠시 상자에 넣어둡니다." },
    { value: "7", label: `${7}${unit} 뒤에 다시 묻기`, desc: "조금 더 오래 둡니다." },
  ];

  return (
    <form action={action} className="flex flex-1 flex-col gap-12">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-base text-ink-soft">보내는 방법</legend>
        {METHODS.map((m) => (
          <label key={m.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 has-[:checked]:border-accent">
            <input
              type="radio"
              name="method"
              value={m.value}
              defaultChecked={defaultMethod === m.value}
              onChange={() => setMethodValue(m.value)}
              required
              className="mt-1.5 accent-accent"
            />
            <span className="flex flex-col">
              <span className="text-lg">{m.label}</span>
              <span className="text-sm text-ink-soft">{m.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {method === "discard" && <DisposalGuide />}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-base text-ink-soft">언제 보낼까요?</legend>
        {COOLINGS.map((c) => (
          <label key={c.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-line px-4 py-3 has-[:checked]:border-accent">
            <input type="radio" name="cooling" value={c.value} defaultChecked={defaultCooling === c.value} className="mt-1.5 accent-accent" />
            <span className="flex flex-col">
              <span className="text-lg">{c.label}</span>
              <span className="text-sm text-ink-soft">{c.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {state?.error && <p role="alert" className="text-sm text-accent">{state.error}</p>}
      <Button type="submit" disabled={pending} className="self-start">이어서</Button>
    </form>
  );
}
