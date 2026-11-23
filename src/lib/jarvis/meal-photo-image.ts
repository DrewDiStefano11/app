/** Decode locally, bound dimensions and strip original metadata before any consented upload. */
export async function prepareMealPhoto(file: File, signal: AbortSignal): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 12 * 1024 * 1024 || file.size === 0)
    throw new Error("Choose a food image under 12 MiB. JPEG, PNG or WebP works best.");
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { image.src = ""; reject(new Error("Photo selection cancelled.")); };
      const cleanup = () => signal.removeEventListener("abort", abort);
      image.onload = () => { cleanup(); resolve(); };
      image.onerror = () => { cleanup(); reject(new Error("This image could not be opened. Try a JPEG photo or screenshot.")); };
      if (signal.aborted) return abort();
      signal.addEventListener("abort", abort, { once: true });
      image.src = url;
    });
    if (signal.aborted) throw new Error("Photo selection cancelled.");
    if (!image.width || !image.height || image.width * image.height > 40_000_000) throw new Error("Choose a smaller food image.");
    const ratio = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the photo.");
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.8);
    canvas.width = canvas.height = 0;
    if (data.length > Math.ceil(2 * 1024 * 1024 / 3) * 4 + 30) throw new Error("Choose a smaller photo; the upload limit is 2 MiB.");
    return data;
  } finally { image.onload = image.onerror = null; URL.revokeObjectURL(url); }
}
