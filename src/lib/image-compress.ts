/** Comprime una imagen en el navegador antes de subirla al panel. */

export async function compressImageFile(
  file: File,
  options?: { maxWidth?: number; quality?: number },
): Promise<{ contentType: "image/jpeg"; dataBase64: string }> {
  const maxWidth = options?.maxWidth ?? 1400;
  const quality = options?.quality ?? 0.82;

  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo debe ser una imagen");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / Math.max(bitmap.width, 1));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("No se pudo procesar la imagen");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) reject(new Error("No se pudo comprimir la imagen"));
        else resolve(result);
      },
      "image/jpeg",
      quality,
    );
  });

  if (blob.size > 500_000) {
    throw new Error(
      "La foto sigue siendo muy pesada. Prueba con otra más liviana.",
    );
  }

  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const dataBase64 = btoa(binary);

  return { contentType: "image/jpeg", dataBase64 };
}
