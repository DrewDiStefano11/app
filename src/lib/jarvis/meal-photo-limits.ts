/** Groq Qwen supports three native images. Keep base64 + JSON below the hosting body limit. */
export const MAX_MEAL_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const MAX_MEAL_PHOTO_BYTES = 3 * 1024 * 1024;
export function mealPhotoBytes(images: readonly string[]) {
  return images.reduce((total, image) => {
    const encoded = image.slice(image.indexOf(",") + 1);
    return total + encoded.length * 3 / 4 - (encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0);
  }, 0);
}
