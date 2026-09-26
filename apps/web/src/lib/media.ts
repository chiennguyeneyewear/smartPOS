import { useEffect, useState } from "react";

// Shrinks big photos in the browser before upload (default: longest side 1600px, JPEG q0.82): a typical
// 4-6 MB phone photo becomes a few hundred KB, which keeps uploads quick on mobile data and storage small.
export async function prepareImage(
  file: File,
  { maxSide = 1600, quality = 0.82, skipBelowBytes = 600 * 1024 } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size < skipBelowBytes) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Local preview URL for a Blob/File, released when it changes or the component unmounts.
export function useObjectUrl(source: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!source) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(source);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [source]);
  return url;
}
