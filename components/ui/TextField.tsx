"use client";
import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  maxLength: number;
  defaultValue?: string | null;
}

export function TextField({ label, hint, error, maxLength, defaultValue, ...props }: BaseProps & Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue">) {
  const id = useId();
  const [len, setLen] = useState(defaultValue?.length ?? 0);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base text-ink-soft">{label}</label>
      <input
        id={id}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        aria-describedby={`${id}-count ${hint ? `${id}-hint` : ""} ${error ? `${id}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setLen(e.target.value.length)}
        className="min-h-12 w-full border-b border-line bg-transparent px-1 py-2 text-xl text-ink outline-none focus:border-accent"
        {...props}
      />
      <div className="flex justify-between text-sm text-ink-soft">
        <span id={`${id}-hint`}>{hint}</span>
        <span id={`${id}-count`} aria-live="polite">{len}/{maxLength}</span>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-accent">{error}</p>}
    </div>
  );
}

export function TextArea({ label, hint, error, maxLength, defaultValue, ...props }: BaseProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "defaultValue">) {
  const id = useId();
  const [len, setLen] = useState(defaultValue?.length ?? 0);
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-base text-ink-soft">{label}</label>
      <textarea
        id={id}
        rows={3}
        maxLength={maxLength}
        defaultValue={defaultValue ?? ""}
        aria-describedby={`${id}-count ${hint ? `${id}-hint` : ""} ${error ? `${id}-error` : ""}`}
        aria-invalid={error ? true : undefined}
        onChange={(e) => setLen(e.target.value.length)}
        className="w-full resize-none border-b border-line bg-transparent px-1 py-2 text-xl leading-relaxed text-ink outline-none focus:border-accent"
        {...props}
      />
      <div className="flex justify-between text-sm text-ink-soft">
        <span id={`${id}-hint`}>{hint}</span>
        <span id={`${id}-count`} aria-live="polite">{len}/{maxLength}</span>
      </div>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-accent">{error}</p>}
    </div>
  );
}
