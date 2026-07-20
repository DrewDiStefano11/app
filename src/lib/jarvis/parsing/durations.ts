import { SourceSpan } from "../contracts/runtime-contracts";

export type DurationUnit = "millisecond" | "second" | "minute" | "hour";

export type DurationWarningCode =
  | "duration_parsed"
  | "ambiguous_duration"
  | "unsupported_duration"
  | "duration_out_of_range";

export interface DurationComponent {
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly numericSourceSpan: SourceSpan;
  readonly unitSourceSpan: SourceSpan;
  readonly numericText: string;
  readonly numericValue: number;
  readonly unit: DurationUnit;
  readonly milliseconds: number;
}

export interface ParsedDuration {
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly components: readonly DurationComponent[];
  readonly totalMilliseconds: number;
  readonly canonicalText: string;
}

export interface DurationParseResult {
  readonly originalText: string;
  readonly durations: readonly ParsedDuration[];
  readonly warnings: readonly DurationWarningCode[];
}

export function durationUnitToMilliseconds(unit: DurationUnit): number {
  switch (unit) {
    case "millisecond":
      return 1;
    case "second":
      return 1000;
    case "minute":
      return 60000;
    case "hour":
      return 3600000;
  }
}

const UNIT_MAP: ReadonlyMap<string, DurationUnit> = new Map([
  ["millisecond", "millisecond"],
  ["milliseconds", "millisecond"],
  ["ms", "millisecond"],
  ["second", "second"],
  ["seconds", "second"],
  ["sec", "second"],
  ["secs", "second"],
  ["minute", "minute"],
  ["minutes", "minute"],
  ["min", "minute"],
  ["mins", "minute"],
  ["hour", "hour"],
  ["hours", "hour"],
  ["hr", "hour"],
  ["hrs", "hour"],
]);

const UNIT_ALIASES = Array.from(UNIT_MAP.keys());
// Sort by length descending to match longest alias first
UNIT_ALIASES.sort((a, b) => b.length - a.length);
const UNIT_PATTERN = UNIT_ALIASES.join("|");

const BOUNDARY_BEFORE = `(?<![a-zA-Z0-9.,\\-/:eE])`;
const NUMERIC_PART = `(\\+?(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?)`;
const SPACE_PART = `(\\s*)`;
const UNIT_PART = `(${UNIT_PATTERN})`;
const BOUNDARY_AFTER = `(?![a-zA-Z0-9\\-])`;

const COMPONENT_REGEX = new RegExp(
  `${BOUNDARY_BEFORE}${NUMERIC_PART}${SPACE_PART}${UNIT_PART}${BOUNDARY_AFTER}`,
  "gi",
);

function parseNumericLiteral(numStr: string): number {
  const cleanStr = numStr.replace(/[,+]/g, "");
  return parseFloat(cleanStr);
}

const UNIT_ORDER: Record<DurationUnit, number> = {
  hour: 4,
  minute: 3,
  second: 2,
  millisecond: 1,
};

const CANONICAL_UNIT_STR: Record<DurationUnit, string> = {
  hour: "hr",
  minute: "min",
  second: "sec",
  millisecond: "ms",
};

const MAX_DURATION_MS = 86400000; // 24 hours

export function parseDurations(input: string): DurationParseResult {
  const durations: ParsedDuration[] = [];
  const warningSet = new Set<DurationWarningCode>();
  const components: DurationComponent[] = [];

  for (const match of input.matchAll(COMPONENT_REGEX)) {
    const fullMatch = match[0];
    const numStr = match[1];
    const spaceStr = match[2];
    const unitStr = match[3];

    const startIndex = match.index!;
    const endIndex = startIndex + fullMatch.length;

    const numericStartIndex = startIndex;
    const numericEndIndex = numericStartIndex + numStr.length;

    const unitStartIndex = numericEndIndex + spaceStr.length;
    const unitEndIndex = unitStartIndex + unitStr.length;

    const unit = UNIT_MAP.get(unitStr.toLowerCase());
    if (!unit) continue;

    const numericValue = parseNumericLiteral(numStr);
    const milliseconds = numericValue * durationUnitToMilliseconds(unit);

    components.push({
      sourceSpan: { startIndex, endIndex },
      originalText: fullMatch,
      numericSourceSpan: { startIndex: numericStartIndex, endIndex: numericEndIndex },
      unitSourceSpan: { startIndex: unitStartIndex, endIndex: unitEndIndex },
      numericText: numStr,
      numericValue,
      unit,
      milliseconds,
    });
  }

  // Find unsupported or ambiguous forms
  const unsupportedRegex =
    /\b(?:one|half|a)\s+(?:hour|minute|second|millisecond)s?\b|\b\d+\s*(?:day|week|month|year)s?\b/gi;
  if (unsupportedRegex.test(input)) {
    warningSet.add("unsupported_duration");
  }

  // Detect adjacent compounds
  let i = 0;
  while (i < components.length) {
    const seq: DurationComponent[] = [components[i]];
    let j = i + 1;
    let isMalformedSeq = false;

    while (j < components.length) {
      const prevComp = components[j - 1];
      const currComp = components[j];

      const gap = input.slice(prevComp.sourceSpan.endIndex, currComp.sourceSpan.startIndex);
      const isAdjacent = /^(?:\s*|\s*,\s*|\s*(?:,\s*)?and\s*)$/i.test(gap);

      if (isAdjacent) {
        seq.push(currComp);

        const prevOrder = UNIT_ORDER[prevComp.unit];
        const currOrder = UNIT_ORDER[currComp.unit];

        if (currOrder >= prevOrder) {
          isMalformedSeq = true; // Duplicate unit or ascending unit
        }

        // Decimals not allowed unless it's the last element of the entire sequence.
        // Actually, decimal is not allowed if there are components after it.
        // We will validate decimal placements later in the full sequence.
      } else {
        break;
      }
      j++;
    }

    if (isMalformedSeq) {
      warningSet.add("ambiguous_duration");
    } else {
      // Validate decimal placements
      for (let k = 0; k < seq.length; k++) {
        const comp = seq[k];
        const isDecimal = comp.numericText.includes(".");
        if (isDecimal && k !== seq.length - 1) {
          isMalformedSeq = true;
          warningSet.add("ambiguous_duration");
        }
      }

      // Check fractional milliseconds.
      for (const comp of seq) {
        if (!Number.isSafeInteger(comp.milliseconds)) {
          isMalformedSeq = true;
          warningSet.add("ambiguous_duration");
        }
      }
    }

    if (!isMalformedSeq) {
      let totalMilliseconds = 0;
      const canonicalParts: string[] = [];
      const seenUnits = new Set<DurationUnit>();

      let duplicateUnit = false;
      for (const comp of seq) {
        if (seenUnits.has(comp.unit)) {
          duplicateUnit = true;
          break;
        }
        seenUnits.add(comp.unit);
        totalMilliseconds += comp.milliseconds;
        canonicalParts.push(`${comp.numericValue} ${CANONICAL_UNIT_STR[comp.unit]}`);
      }

      if (duplicateUnit) {
        warningSet.add("ambiguous_duration");
      } else if (totalMilliseconds > MAX_DURATION_MS) {
        warningSet.add("duration_out_of_range");
      } else {
        const startIndex = seq[0].sourceSpan.startIndex;
        const endIndex = seq[seq.length - 1].sourceSpan.endIndex;
        const originalText = input.slice(startIndex, endIndex);
        const canonicalText = canonicalParts.join(" ");

        durations.push({
          sourceSpan: { startIndex, endIndex },
          originalText,
          components: seq,
          totalMilliseconds,
          canonicalText,
        });
        warningSet.add("duration_parsed");
      }
    }

    i = j;
  }

  // Ambiguity checks
  // Things like 1:30 or 1 minute 30 are not parsed into valid durations for the partial parts, but we can detect them to add ambiguous warning.
  if (/\b\d{1,2}:\d{2}\b/.test(input)) {
    // wait, clock-time protection says: do not parse clock-time expressions, but we might want to ensure they don't get partially parsed or emit ambiguous. The requirement says:
    // "Do not treat the numbers around a colon as independent durations."
    // "Example: at 5:30 for 20 minutes must return only the 20 minutes duration."
    // Does "at 5:30" emit ambiguous_duration? "Treat conservatively." "Ambiguous: 1:30".
    // Ok, we emit ambiguous.
    warningSet.add("ambiguous_duration");
  }

  // Check for ambiguous bare numbers after units (like "1 minute 30")
  for (const match of input.matchAll(
    /\b(?:\d+(?:\.\d+)?)\s+(?:hour|minute|second|millisecond)s?\s+(\d+(?:\.\d+)?)\b/gi,
  )) {
    const nextText = input.slice(match.index! + match[0].length);
    if (!/^\s*(?:hour|minute|second|millisecond|hr|min|sec|ms)/i.test(nextText)) {
      warningSet.add("ambiguous_duration");
    }
  }

  const WARNING_ORDER = [
    "duration_parsed",
    "ambiguous_duration",
    "unsupported_duration",
    "duration_out_of_range",
  ] as const;

  const warnings: DurationWarningCode[] = WARNING_ORDER.filter((w) => warningSet.has(w));

  return {
    originalText: input,
    durations,
    warnings,
  };
}
