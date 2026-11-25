import type { SavedNutritionPreset } from "./types";
export const MAX_NUTRITION_ALIASES = 8;
export const MAX_NUTRITION_ALIAS_LENGTH = 80;
export const normalizeNutritionName = (name: string) => name.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export function parseNutritionAliases(input: unknown): string[] | undefined {
  if (!Array.isArray(input) || input.length > MAX_NUTRITION_ALIASES) return;
  const result: string[] = [], seen = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") return;
    const alias = value.trim().replace(/\s+/g, " "), key = normalizeNutritionName(alias);
    if (!key || alias.length > MAX_NUTRITION_ALIAS_LENGTH) return;
    if (!seen.has(key)) { seen.add(key); result.push(alias); }
  }
  return result;
}
export function nutritionPresetNames(preset: SavedNutritionPreset) { return [preset.meal.name, ...(preset.aliases ?? [])]; }
