const AVATAR_SIZE = 200;
const JPEG_QUALITY = 0.82;

/**
 * Turns a picked/photographed file into a small square JPEG data URL, ready
 * to store inline on the user's profile (see UserProfile.photoUrl) — no
 * Firebase Storage bucket needed. Center-crops to a square (cover-fit, like
 * a native avatar picker) rather than squashing a non-square photo.
 */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elige un archivo de imagen.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen.");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
