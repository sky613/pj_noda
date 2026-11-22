/**
 * 사진을 최대 1200px로 리사이즈하고 JPEG로 재인코딩한다.
 * Canvas 재인코딩 과정에서 EXIF(위치 정보 포함)는 모두 제거된다.
 * imageOrientation: "from-image" 로 회전을 먼저 적용해 방향이 틀어지지 않게 한다.
 */
export async function resizeImage(file: File, maxSize = 1200, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/jpeg", quality);
  });
}
