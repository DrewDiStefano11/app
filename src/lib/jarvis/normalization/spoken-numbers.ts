import type { SourceSpan } from "../contracts/runtime-contracts.js";

export type SpokenNumberWarningCode =
  | "number_normalized"
  | "ambiguous_number_phrase"
  | "unsupported_number_phrase";

export interface SpokenNumberReplacement {
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly replacementText: string;
  readonly numericValue: number;
}

export interface SpokenNumberNormalizationResult {
  readonly originalText: string;
  readonly normalizedText: string;
  readonly replacements: readonly SpokenNumberReplacement[];
  readonly warnings: readonly SpokenNumberWarningCode[];
}

const ONES: ReadonlyMap<string, number> = new Map([
  ["zero", 0],
  ["one", 1],
  ["two", 2],
  ["three", 3],
  ["four", 4],
  ["five", 5],
  ["six", 6],
  ["seven", 7],
  ["eight", 8],
  ["nine", 9],
  ["ten", 10],
  ["eleven", 11],
  ["twelve", 12],
  ["thirteen", 13],
  ["fourteen", 14],
  ["fifteen", 15],
  ["sixteen", 16],
  ["seventeen", 17],
  ["eighteen", 18],
  ["nineteen", 19],
]);

const TENS: ReadonlyMap<string, number> = new Map([
  ["twenty", 20],
  ["thirty", 30],
  ["forty", 40],
  ["fifty", 50],
  ["sixty", 60],
  ["seventy", 70],
  ["eighty", 80],
  ["ninety", 90],
]);

export interface Token {
  readonly originalText: string;
  readonly normalized: string;
  readonly startIndex: number;
  readonly endIndex: number;
}

/**
 * Tokenizes by finding word sequences separated by hyphens or word boundaries.
 * We match word characters [a-z0-9]+ optionally joined by a single hyphen to another word.
 * However, since we want to be able to split hyphenated *number* words if both sides are numbers,
 * we will keep it simple and tokenize words, treating hyphens specially later, or we can just extract all `[A-Za-z0-9]+(-[A-Za-z0-9]+)?` etc.
 * Actually, instructions say "Only split hyphenated tokens when every component forms a supported number construction."
 * So it's easier to tokenize on `[a-z0-9]+` and also track hyphens, OR we can tokenize on contiguous non-whitespace.
 *
 * Let's use a regex that extracts words: `[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*` or similar.
 * Actually, it's safer to extract words: `[a-zA-Z]+(?:-[a-zA-Z]+)*` and standalone numbers `[0-9]+(?:\.[0-9]+)?`.
 * But we need to handle "twenty-one" as either one token or two tokens. If we treat it as one token, we have to parse it inside `parseSpokenNumberPhrase`.
 * Let's just tokenize by finding sequences of letters and digits.
 */
export function tokenize(input: string): readonly Token[] {
  const tokens: Token[] = [];
  // Match words, digits (with optional commas/decimals), hyphens, or other punctuation
  const regex = /[A-Za-z]+|[0-9]+(?:,[0-9]+)*(?:\.[0-9]+)?|-|[^\sA-Za-z0-9-]+/g;
  let match;
  while ((match = regex.exec(input)) !== null) {
    tokens.push({
      originalText: match[0],
      normalized: match[0].toLowerCase(),
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    });
  }
  return tokens;
}

export interface ParsedNumberResult {
  readonly value: number;
  readonly tokenCount: number;
  readonly replacementText: string;
}

/**
 * Attempts to parse a single cardinal or decimal number phrase starting at index 0 of `tokens`.
 * Returns the longest valid match.
 */
export function parseSpokenNumberPhrase(tokens: readonly Token[]): ParsedNumberResult | undefined {
  if (tokens.length === 0) return undefined;

  // A number phrase can be: [negative] <cardinal> [point <digits>] or standalone zero.

  let bestMatch: ParsedNumberResult | undefined = undefined;

  function updateBestMatch(value: number, tokenCount: number, replacementText: string) {
    // Only accept valid values within range
    if (!Number.isFinite(value)) return;
    if (value > 999999 || value < -999999) return; // Note: -999999 is implied if max is 999999

    if (!bestMatch || tokenCount > bestMatch.tokenCount) {
      bestMatch = { value, tokenCount, replacementText };
    }
  }

  // Parse negative
  let isNegative = false;
  let startIndex = 0;
  if (tokens[0].normalized === "negative") {
    isNegative = true;
    startIndex = 1;
  }

  // We can try parsing a cardinal part.
  const cardinalRes = parseCardinal(tokens, startIndex);

  if (cardinalRes) {
    // We found a cardinal part.
    let tokenCount = startIndex + cardinalRes.tokenCount;
    let val = cardinalRes.value;
    if (isNegative) val = -val;

    // Check for decimal part
    const decRes = parseDecimalPart(tokens, tokenCount);
    if (decRes) {
      const fullVal = isNegative ? val - decRes.value : val + decRes.value;
      const fullTokenCount = tokenCount + decRes.tokenCount;
      const rep =
        (isNegative ? "-" : "") + cardinalRes.replacementText + "." + decRes.replacementText;
      updateBestMatch(fullVal, fullTokenCount, rep);
    } else {
      const rep = (isNegative ? "-" : "") + cardinalRes.replacementText;
      updateBestMatch(val, tokenCount, rep);
    }
  }

  return bestMatch;
}

/** Parses a sequence of tokens into a cardinal number (0 to 999999) */
function parseCardinal(
  tokens: readonly Token[],
  start: number,
): { value: number; tokenCount: number; replacementText: string } | undefined {
  if (start >= tokens.length) return undefined;

  // Special case: standalone zero
  if (tokens[start].normalized === "zero") {
    return { value: 0, tokenCount: 1, replacementText: "0" };
  }

  // Parses thousands, hundreds, tens, ones.

  let value = 0;
  let tokenCount = 0;
  let i = start;

  // Function to parse a number < 1000 (hundreds, tens, ones)
  function parseBelow1000(idx: number): { val: number; count: number } | undefined {
    let subVal = 0;
    let subCount = 0;

    // Parse hundreds: [ones] "hundred"
    const ones1 = parseOnesOrTens(tokens, idx);
    if (
      ones1 &&
      idx + ones1.count < tokens.length &&
      tokens[idx + ones1.count].normalized === "hundred"
    ) {
      if (ones1.val >= 1 && ones1.val <= 9) {
        subVal += ones1.val * 100;
        subCount += ones1.count + 1; // including "hundred"
      }
    }

    // Optional "and"
    let afterHundredIdx = idx + subCount;
    let hasAnd = false;
    if (
      subCount > 0 &&
      afterHundredIdx < tokens.length &&
      tokens[afterHundredIdx].normalized === "and"
    ) {
      // We only consume "and" if it's followed by a valid tens/ones
      hasAnd = true;
    }

    const nextIdx = hasAnd ? afterHundredIdx + 1 : afterHundredIdx;

    // Parse remainder (tens and ones)
    const rem = parseOnesOrTens(tokens, nextIdx);
    if (rem) {
      subVal += rem.val;
      subCount = nextIdx - idx + rem.count;
    }

    if (subCount === 0) return undefined;
    return { val: subVal, count: subCount };
  }

  // Try parsing thousands part
  const part1 = parseBelow1000(i);
  let hasThousands = false;
  if (
    part1 &&
    i + part1.count < tokens.length &&
    tokens[i + part1.count].normalized === "thousand"
  ) {
    value += part1.val * 1000;
    tokenCount += part1.count + 1;
    i += part1.count + 1;
    hasThousands = true;
  }

  // If we had a thousands part, we might have an optional "and" before the rest
  let hasAnd = false;
  if (hasThousands && i < tokens.length && tokens[i].normalized === "and") {
    // Only valid if followed by something < 1000
    hasAnd = true;
  }

  const nextI = hasAnd ? i + 1 : i;

  // Try parsing remainder < 1000

  if (!hasThousands) {
    if (part1) {
      value += part1.val;
      tokenCount += part1.count;
    } else {
      return undefined;
    }
  } else {
    const part2 = parseBelow1000(nextI);
    if (part2) {
      value += part2.val;
      tokenCount = nextI - start + part2.count;
    }
  }

  if (tokenCount === 0) return undefined;
  return { value, tokenCount, replacementText: value.toString() };
}

/** Parses tens and ones, handling hyphens (e.g., "twenty-one" or "twenty one") */
function parseOnesOrTens(
  tokens: readonly Token[],
  start: number,
): { val: number; count: number } | undefined {
  if (start >= tokens.length) return undefined;

  const tok = tokens[start].normalized;

  if (ONES.has(tok)) {
    return { val: ONES.get(tok)!, count: 1 };
  }

  if (TENS.has(tok)) {
    let val = TENS.get(tok)!;
    let count = 1;

    // Look ahead for optional hyphen and ones
    if (start + 1 < tokens.length) {
      let nextIdx = start + 1;
      let hasHyphen = false;
      if (tokens[nextIdx].normalized === "-") {
        hasHyphen = true;
        nextIdx++;
      }

      if (nextIdx < tokens.length) {
        const nextTok = tokens[nextIdx].normalized;
        if (ONES.has(nextTok) && ONES.get(nextTok)! >= 1 && ONES.get(nextTok)! <= 9) {
          val += ONES.get(nextTok)!;
          count = nextIdx - start + 1;
        }
      }
    }
    return { val, count };
  }

  return undefined;
}

/** Parses decimal part (e.g., "point five zero") */
function parseDecimalPart(
  tokens: readonly Token[],
  start: number,
): { value: number; tokenCount: number; replacementText: string } | undefined {
  if (start >= tokens.length) return undefined;
  if (tokens[start].normalized !== "point") return undefined;

  let i = start + 1;
  let decimalStr = "";
  let val = 0;
  let multiplier = 0.1;

  while (i < tokens.length) {
    const tok = tokens[i].normalized;
    if (ONES.has(tok) && ONES.get(tok)! >= 0 && ONES.get(tok)! <= 9) {
      const digit = ONES.get(tok)!;
      decimalStr += digit.toString();
      val += digit * multiplier;
      multiplier *= 0.1;
      i++;
    } else {
      break;
    }
  }

  if (decimalStr.length === 0) return undefined; // Require at least one digit

  return { value: val, tokenCount: i - start, replacementText: decimalStr };
}

const NUMBER_WORDS = new Set([
  ...ONES.keys(),
  ...TENS.keys(),
  "hundred",
  "thousand",
  "negative",
  "point",
  "and",
  "-",
]);

export function normalizeSpokenNumbers(input: string): SpokenNumberNormalizationResult {
  const tokens = tokenize(input);
  const replacements: SpokenNumberReplacement[] = [];
  const warningsSet = new Set<SpokenNumberWarningCode>();

  let i = 0;
  while (i < tokens.length) {
    if (
      /^[0-9]/.test(tokens[i].normalized) ||
      (tokens[i].normalized === "-" &&
        i + 1 < tokens.length &&
        /^[0-9]/.test(tokens[i + 1].normalized))
    ) {
      i++;
      continue;
    }

    const tok = tokens[i].normalized;
    const isUnsupportedMag =
      tok === "million" ||
      tok === "billion" ||
      tok === "trillion" ||
      tok === "half" ||
      tok === "minus" ||
      tok === "first" ||
      tok === "second" ||
      tok === "third" ||
      tok === "fourth" ||
      tok === "fifth";

    let advanced = false;
    if (NUMBER_WORDS.has(tok) || isUnsupportedMag) {
      let jOriginal = i;
      let hasUnsupported = false;
      while (jOriginal < tokens.length) {
        const nextTok = tokens[jOriginal].normalized;
        if (
          nextTok === "million" ||
          nextTok === "billion" ||
          nextTok === "trillion" ||
          nextTok === "half" ||
          nextTok === "minus" ||
          nextTok === "first" ||
          nextTok === "second" ||
          nextTok === "third" ||
          nextTok === "fourth" ||
          nextTok === "fifth"
        ) {
          hasUnsupported = true;
          jOriginal++;
        } else if (NUMBER_WORDS.has(nextTok)) {
          jOriginal++;
        } else {
          break;
        }
      }

      if (jOriginal < tokens.length) {
        const nextAfterBlock = tokens[jOriginal].normalized;
        if (
          nextAfterBlock === "half" ||
          nextAfterBlock === "halves" ||
          nextAfterBlock === "quarter" ||
          nextAfterBlock === "quarters" ||
          nextAfterBlock === "first" ||
          nextAfterBlock === "second" ||
          nextAfterBlock === "third" ||
          nextAfterBlock.endsWith("th") ||
          nextAfterBlock.endsWith("ths")
        ) {
          hasUnsupported = true;
        }
      }

      const blockTokens = tokens.slice(i, jOriginal);
      const res = parseSpokenNumberPhrase(blockTokens);

      if (res && res.tokenCount === blockTokens.length && !hasUnsupported) {
        const startToken = tokens[i];
        const endToken = tokens[i + res.tokenCount - 1];
        const sourceSpan: SourceSpan = {
          startIndex: startToken.startIndex,
          endIndex: endToken.endIndex,
        };

        let isCorrupting = false;
        if (sourceSpan.startIndex > 0 && input[sourceSpan.startIndex - 1] === "-") {
          const prevChar = input[sourceSpan.startIndex - 2];
          if (prevChar && /[A-Za-z0-9]/.test(prevChar)) isCorrupting = true;
        }
        if (sourceSpan.endIndex < input.length && input[sourceSpan.endIndex] === "-") {
          const nextChar = input[sourceSpan.endIndex + 1];
          if (nextChar && /[A-Za-z0-9]/.test(nextChar)) isCorrupting = true;
        }

        if (!isCorrupting) {
          replacements.push({
            sourceSpan,
            originalText: input.slice(sourceSpan.startIndex, sourceSpan.endIndex),
            replacementText: res.replacementText,
            numericValue: res.value,
          });
          warningsSet.add("number_normalized");
        }
      } else {
        if (hasUnsupported) {
          warningsSet.add("unsupported_number_phrase");
        } else {
          warningsSet.add("ambiguous_number_phrase");
        }
      }

      i = jOriginal;
      advanced = true;
    }

    if (!advanced) {
      i++;
    }
  }

  return assembleFinalResult(input, replacements, warningsSet);
}

function assembleFinalResult(
  input: string,
  replacements: SpokenNumberReplacement[],
  warningsSet: Set<SpokenNumberWarningCode>,
): SpokenNumberNormalizationResult {
  // Sort warnings according to required stable order
  const warnings: SpokenNumberWarningCode[] = [];
  if (warningsSet.has("number_normalized")) warnings.push("number_normalized");
  if (warningsSet.has("ambiguous_number_phrase")) warnings.push("ambiguous_number_phrase");
  if (warningsSet.has("unsupported_number_phrase")) warnings.push("unsupported_number_phrase");

  let normalizedText = "";
  let lastIndex = 0;

  for (const rep of replacements) {
    normalizedText += input.slice(lastIndex, rep.sourceSpan.startIndex);
    normalizedText += rep.replacementText;
    lastIndex = rep.sourceSpan.endIndex;
  }
  normalizedText += input.slice(lastIndex);

  return {
    originalText: input,
    normalizedText,
    replacements,
    warnings,
  };
}
