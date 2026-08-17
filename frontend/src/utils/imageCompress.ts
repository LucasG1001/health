const MAX_EDGE = 1280;
const QUALITY = 0.85;
const SKIP_BELOW_BYTES = 512 * 1024;

function toJpegName(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || "imagem"}.jpg`;
}

/**
 * A foto sai da câmera com vários MB e é exibida em miniaturas de 64px — sem reduzir antes
 * do upload, o celular baixa e decodifica a imagem inteira toda vez que o cache expira.
 * Qualquer falha (formato exótico, canvas indisponível) devolve o arquivo original.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", QUALITY);
    });
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}
