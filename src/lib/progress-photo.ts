import type { AppState } from "./types";

export const PROGRESS_PHOTO_MAX_CHARACTERS = 40_000;
const STORAGE_BUDGET_BYTES = 4_000_000;

// Reserve two complete UTF-16 snapshots for the existing atomic persistence
// slots, envelope overhead, and room for future workout/meal writes. This is a
// conservative bound, not a promise about a browser's remaining quota.
export function progressPhotoFitsStorage(state: AppState, otherStorageBytes = 0): boolean {
  return JSON.stringify(state).length * 4 + otherStorageBytes + 300_000 <= STORAGE_BUDGET_BYTES;
}

export async function prepareProgressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/") || file.size > 12_000_000) {
    throw new Error("Choose an image smaller than 12 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 40_000_000
    ) {
      throw new Error("Choose an image with fewer than 40 million pixels.");
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser could not prepare the image.");
    for (const edge of [1280, 960, 720, 540, 400, 300]) {
      const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.8, 0.65, 0.5]) {
        const data = canvas.toDataURL("image/jpeg", quality);
        if (
          data.startsWith("data:image/jpeg;base64,") &&
          data.length <= PROGRESS_PHOTO_MAX_CHARACTERS
        )
          return data;
      }
    }
    throw new Error("This photo is too detailed for device storage. Choose a smaller image.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
