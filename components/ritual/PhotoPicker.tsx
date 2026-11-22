"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resizeImage } from "@/lib/image/resize";

const BUCKET = "ritual-photos";

interface Props {
  ritualId: string;
  userId: string;
  existingPath: string | null;
}

/**
 * 사진 1장. 클라이언트에서 1200px 리사이즈 + JPEG 재인코딩(EXIF 제거) 후 본인 폴더에 업로드.
 * 결과 경로는 hidden input(photo_path)으로 폼에 실린다. "__remove__" 는 제거 요청.
 */
export function PhotoPicker({ ritualId, userId, existingPath }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [path, setPath] = useState<string>(""); // "" = 변경 없음
  const [hasPhoto, setHasPhoto] = useState(Boolean(existingPath));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기존 사진 미리보기 (짧은 signed URL, 브라우저 → Supabase 직접)
  useEffect(() => {
    if (!existingPath) return;
    const supabase = createClient();
    supabase.storage.from(BUCKET).createSignedUrl(existingPath, 60).then(({ data }) => {
      if (data?.signedUrl) setPreview(data.signedUrl);
    });
  }, [existingPath]);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await resizeImage(file, 1200);
      const objectPath = `${userId}/${ritualId}.jpg`;
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, blob, { contentType: "image/jpeg", upsert: true });
      if (upErr) throw upErr;
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(blob));
      setPath(objectPath);
      setHasPhoto(true);
    } catch {
      setError("사진을 올리지 못했어요. 다른 사진으로 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const supabase = createClient();
    const target = path || existingPath;
    if (target) await supabase.storage.from(BUCKET).remove([target]);
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(null);
    setPath("__remove__");
    setHasPhoto(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="photo_path" value={path} />
      <span className="text-base text-ink-soft">사진 한 장 (선택)</span>
      {hasPhoto && preview ? (
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="보내려는 물건 사진" className="max-h-72 w-full rounded-xl object-cover" />
          <button type="button" onClick={remove} className="self-start text-sm text-ink-soft underline-offset-4 hover:underline">
            사진 빼기
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="flex min-h-28 cursor-pointer items-center justify-center rounded-xl border border-dashed border-line text-base text-ink-soft hover:bg-bg-soft"
        >
          {busy ? "담는 중…" : "사진 고르기"}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onChange}
        disabled={busy}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <p className="text-xs text-ink-soft">사진은 기기에서 줄이고 위치 정보를 지운 뒤에만 올라가요.</p>
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-accent">{error}</p>}
    </div>
  );
}
