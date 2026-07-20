import type { NormalizedTranscript } from "../contracts/runtime-contracts.js";

type WarningCode =
  | "unicode_normalized"
  | "whitespace_normalized"
  | "control_characters_removed"
  | "zero_width_characters_removed"
  | "punctuation_normalized"
  | "case_normalized"
  | "no_meaningful_text";

/**
 * Checks if the string contains any meaningful letters or numbers.
 * Punctuation and whitespace alone are not considered meaningful.
 */
export function hasMeaningfulTranscriptText(input: string): boolean {
  return /[\p{L}\p{N}]/u.test(input);
}

/**
 * A deterministic transcript-cleanup module that converts a raw speech-to-text
 * transcript into a safe normalized transcript suitable for later Jarvis parsing stages.
 * It preserves the exact original transcript while producing deterministic normalized parsing text.
 */
export function cleanTranscript(input: string): NormalizedTranscript {
  // 1. Preserve original input exactly
  const originalText = input;
  let text = input;
  const triggeredWarnings = new Set<WarningCode>();

  // Helper to add warnings
  const addWarning = (code: WarningCode) => {
    triggeredWarnings.add(code);
  };

  // 3. Line-ending and whitespace normalization
  // Normalize carriage returns, line feeds, tabs, non-breaking spaces, and common Unicode space separators
  // Note: we use \p{White_Space} to match Unicode spaces comprehensively.
  // We avoid \s because \s can match BOM (\uFEFF) in some JS engines/environments which is meant for zero-width processing.
  // Actually, we'll replace matches of \p{White_Space} exactly.
  // However, `\s` in JS matches BOM. So we explicitly exclude BOM from whitespace normalization or just rely on \p{White_Space} and \n\r\t
  // Let's use `\p{White_Space}` alone, as it covers everything including standard spaces.
  const wsNormalized = text.replace(/\p{White_Space}+/gu, " ");
  if (wsNormalized !== text) {
    addWarning("whitespace_normalized");
    text = wsNormalized;
  }

  // 4. Remove unsafe control characters
  // Embedded ASCII and Unicode control characters that are not intentionally converted into normal whitespace.
  const ccRemoved = text.replace(/\p{Cc}/gu, "");
  if (ccRemoved !== text) {
    addWarning("control_characters_removed");
    text = ccRemoved;
  }

  // 5. Remove zero-width formatting artifacts
  // Common invisible formatting characters: ZWSP, ZWNJ, ZWJ, LRM, RLM (\u200B-\u200F), BOM (\uFEFF)
  const zwRemoved = text.replace(/[\u200B-\u200F\uFEFF]/g, "");
  if (zwRemoved !== text) {
    addWarning("zero_width_characters_removed");
    text = zwRemoved;
  }

  // 6. Normalize common smart punctuation
  const punctNormalized = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...");

  if (punctNormalized !== text) {
    addWarning("punctuation_normalized");
    text = punctNormalized;
  }

  // 2. Unicode normalization (moved after structural removals to avoid conflating warnings)
  // Use NFKC because it safely canonicalizes common speech-to-text artifacts such as
  // full-width letters, full-width numbers, compatibility characters, and visually equivalent Unicode forms.
  const unicodeNormalized = text.normalize("NFKC");
  if (unicodeNormalized !== text) {
    addWarning("unicode_normalized");
    text = unicodeNormalized;
  }

  // 7. Case normalization
  // Convert to lowercase using deterministic, non-locale-specific behavior.
  const caseNormalized = text.toLowerCase();
  if (caseNormalized !== text) {
    addWarning("case_normalized");
    text = caseNormalized;
  }

  // 8. Final whitespace pass
  // Trim and collapse any newly created repeated spaces.
  const finalTrimmed = text.trim();
  const finalWs = finalTrimmed.replace(/ {2,}/g, " ");

  if (finalWs !== text) {
    addWarning("whitespace_normalized");
    text = finalWs;
  }

  // 9. Meaningful-text detection
  const hasMeaningfulText = hasMeaningfulTranscriptText(text);
  if (!hasMeaningfulText) {
    addWarning("no_meaningful_text");
  }

  const ORDERED_WARNINGS: WarningCode[] = [
    "unicode_normalized",
    "whitespace_normalized",
    "control_characters_removed",
    "zero_width_characters_removed",
    "punctuation_normalized",
    "case_normalized",
    "no_meaningful_text",
  ];

  const warnings = ORDERED_WARNINGS.filter((code) => triggeredWarnings.has(code));

  return {
    originalText,
    normalizedText: text,
    hasMeaningfulText,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export function normalizeTranscriptText(input: string): string {
  return cleanTranscript(input).normalizedText;
}
