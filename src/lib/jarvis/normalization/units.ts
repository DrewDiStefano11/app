import type { SourceSpan } from "../contracts/runtime-contracts.js";

export type UnitCategory = "count" | "weight" | "time" | "distance";

export type CanonicalUnit = "rep" | "set" | "lb" | "kg" | "sec" | "min" | "hr" | "m" | "km" | "mi";

export type UnitNormalizationWarningCode =
  | "unit_normalized"
  | "ambiguous_unit_alias"
  | "unsupported_unit";

export interface UnitReplacement {
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly replacementText: CanonicalUnit;
  readonly canonicalUnit: CanonicalUnit;
  readonly category: UnitCategory;
}

export interface NormalizedQuantity {
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly numericSourceSpan: SourceSpan;
  readonly unitSourceSpan: SourceSpan;
  readonly numericText: string;
  readonly numericValue: number;
  readonly canonicalUnit: CanonicalUnit;
  readonly category: UnitCategory;
}

export interface UnitNormalizationResult {
  readonly originalText: string;
  readonly normalizedText: string;
  readonly replacements: readonly UnitReplacement[];
  readonly quantities: readonly NormalizedQuantity[];
  readonly warnings: readonly UnitNormalizationWarningCode[];
}

const COUNT_UNITS = new Map<string, CanonicalUnit>([
  ["rep", "rep"],
  ["reps", "rep"],
  ["repetition", "rep"],
  ["repetitions", "rep"],
  ["set", "set"],
  ["sets", "set"],
]);

const WEIGHT_UNITS = new Map<string, CanonicalUnit>([
  ["lb", "lb"],
  ["lbs", "lb"],
  ["pound", "lb"],
  ["pounds", "lb"],
  ["kg", "kg"],
  ["kgs", "kg"],
  ["kilogram", "kg"],
  ["kilograms", "kg"],
  ["kilo", "kg"],
  ["kilos", "kg"],
]);

const TIME_UNITS = new Map<string, CanonicalUnit>([
  ["sec", "sec"],
  ["secs", "sec"],
  ["second", "sec"],
  ["seconds", "sec"],
  ["min", "min"],
  ["mins", "min"],
  ["minute", "min"],
  ["minutes", "min"],
  ["hr", "hr"],
  ["hrs", "hr"],
  ["hour", "hr"],
  ["hours", "hr"],
]);

const DISTANCE_UNITS = new Map<string, CanonicalUnit>([
  ["meter", "m"],
  ["meters", "m"],
  ["metre", "m"],
  ["metres", "m"],
  ["km", "km"],
  ["kilometer", "km"],
  ["kilometers", "km"],
  ["kilometre", "km"],
  ["kilometres", "km"],
  ["mi", "mi"],
  ["mile", "mi"],
  ["miles", "mi"],
]);

const AMBIGUOUS_ALIASES = new Set<string>(["m", "s", "h"]);

const UNSUPPORTED_ALIASES = new Set<string>([
  "stone",
  "stones",
  "ounce",
  "ounces",
  "oz",
  "yard",
  "yards",
  "feet",
  "foot",
  "inch",
  "inches",
]);

export function resolveUnitAlias(
  alias: string,
): { readonly canonicalUnit: CanonicalUnit; readonly category: UnitCategory } | undefined {
  const lower = alias.toLowerCase();
  if (COUNT_UNITS.has(lower)) {
    return { canonicalUnit: COUNT_UNITS.get(lower) as CanonicalUnit, category: "count" };
  }
  if (WEIGHT_UNITS.has(lower)) {
    return { canonicalUnit: WEIGHT_UNITS.get(lower) as CanonicalUnit, category: "weight" };
  }
  if (TIME_UNITS.has(lower)) {
    return { canonicalUnit: TIME_UNITS.get(lower) as CanonicalUnit, category: "time" };
  }
  if (DISTANCE_UNITS.has(lower)) {
    return { canonicalUnit: DISTANCE_UNITS.get(lower) as CanonicalUnit, category: "distance" };
  }
  return undefined;
}

// Negative lookbehind to ensure the number is not part of a larger word, fraction, range, or time format.
const BOUNDARY_LOOKBEHIND = `(?<![\\w.,/:%+*-])`;

// Matches optional sign, integer (with or without comma grouping), and optional decimal.
const NUMBER_LITERAL = `([+-]?(?:[1-9]\\d{0,2}(?:,\\d{3})+|0|\\d+)(?:\\.\\d+)?)`;

// Matches optional whitespace between number and unit.
const OPTIONAL_SPACE = `([\\s]*)`;

// Matches the unit alias consisting of alphabetic characters.
const UNIT_WORD = `([a-zA-Z]+)`;

// Negative lookahead to ensure the unit is not part of a larger compound word (e.g., hyphenated adjective).
const BOUNDARY_LOOKAHEAD = `(?![\\w-])`;

const QUANTITY_PATTERN = new RegExp(
  `${BOUNDARY_LOOKBEHIND}${NUMBER_LITERAL}${OPTIONAL_SPACE}${UNIT_WORD}${BOUNDARY_LOOKAHEAD}`,
  "g",
);

function calculateNumericValue(text: string): number {
  const cleaned = text.replace(/,/g, "");
  const val = Number(cleaned);
  if (!Number.isFinite(val)) return NaN;
  if (Math.abs(val) > Number.MAX_SAFE_INTEGER) return NaN;
  return val;
}

export function normalizeUnits(input: string): UnitNormalizationResult {
  const replacements: UnitReplacement[] = [];
  const quantities: NormalizedQuantity[] = [];
  const warningsSet = new Set<UnitNormalizationWarningCode>();

  let resultText = "";
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  QUANTITY_PATTERN.lastIndex = 0;

  while ((match = QUANTITY_PATTERN.exec(input)) !== null) {
    const numericText = match[1] as string;
    const spaceText = match[2] as string;
    const unitText = match[3] as string;

    const startIndex = match.index;
    const unitLower = unitText.toLowerCase();

    // Verify comma format:
    // If it has commas, split by comma. First part max 3 chars, following parts exactly 3 chars.
    if (numericText.includes(",")) {
      const parts = numericText.split(",");
      const firstPart = parts[0]!.replace(/^[+-]/, ""); // Ignore optional sign
      if (firstPart.length === 0 || firstPart.length > 3) {
        continue; // Invalid comma form
      }
      let validCommas = true;
      for (let i = 1; i < parts.length; i++) {
        // Last part can contain decimal
        if (i === parts.length - 1) {
          const decimalParts = parts[i]!.split(".");
          if (decimalParts[0]!.length !== 3) {
            validCommas = false;
            break;
          }
        } else {
          if (parts[i]!.length !== 3) {
            validCommas = false;
            break;
          }
        }
      }
      if (!validCommas) {
        continue;
      }
    }

    const resolved = resolveUnitAlias(unitLower);

    if (resolved) {
      const numericValue = calculateNumericValue(numericText);
      if (!Number.isFinite(numericValue)) {
        continue;
      }

      const numericStart = startIndex;
      const numericEnd = numericStart + numericText.length;

      const unitStart = numericEnd + spaceText.length;
      const unitEnd = unitStart + unitText.length;

      const sourceSpan: SourceSpan = {
        startIndex: numericStart,
        endIndex: unitEnd,
      };

      const numericSourceSpan: SourceSpan = {
        startIndex: numericStart,
        endIndex: numericEnd,
      };

      const unitSourceSpan: SourceSpan = {
        startIndex: unitStart,
        endIndex: unitEnd,
      };

      const replacement: UnitReplacement = {
        sourceSpan: unitSourceSpan,
        originalText: unitText,
        replacementText: resolved.canonicalUnit,
        canonicalUnit: resolved.canonicalUnit,
        category: resolved.category,
      };

      const quantity: NormalizedQuantity = {
        sourceSpan,
        originalText: input.slice(numericStart, unitEnd),
        numericSourceSpan,
        unitSourceSpan,
        numericText,
        numericValue,
        canonicalUnit: resolved.canonicalUnit,
        category: resolved.category,
      };

      replacements.push(replacement);
      quantities.push(quantity);

      if (unitText !== resolved.canonicalUnit) {
        warningsSet.add("unit_normalized");
      }

      resultText += input.slice(lastIndex, unitStart) + resolved.canonicalUnit;
      lastIndex = unitEnd;
    } else if (AMBIGUOUS_ALIASES.has(unitLower)) {
      warningsSet.add("ambiguous_unit_alias");
    } else if (UNSUPPORTED_ALIASES.has(unitLower)) {
      warningsSet.add("unsupported_unit");
    }
  }

  resultText += input.slice(lastIndex);

  // Deterministic ordered warnings
  const warnings: UnitNormalizationWarningCode[] = [];
  if (warningsSet.has("unit_normalized")) warnings.push("unit_normalized");
  if (warningsSet.has("ambiguous_unit_alias")) warnings.push("ambiguous_unit_alias");
  if (warningsSet.has("unsupported_unit")) warnings.push("unsupported_unit");

  return {
    originalText: input,
    normalizedText: resultText,
    replacements,
    quantities,
    warnings,
  };
}
