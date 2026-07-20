import type { SourceSpan } from "../contracts/runtime-contracts";

export type CommandTokenKind = "word" | "number" | "punctuation";

export interface CommandToken {
  readonly kind: CommandTokenKind;
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly comparisonText: string;
}

export interface PhrasePattern {
  readonly id: string;
  readonly words: readonly string[];
  readonly allowCommaSeparators?: boolean;
  readonly allowTerminalPunctuation?: boolean;
}

export interface PhraseMatch {
  readonly patternId: string;
  readonly sourceSpan: SourceSpan;
  readonly originalText: string;
  readonly tokenStartIndex: number;
  readonly tokenEndIndex: number;
  readonly matchedTokens: readonly CommandToken[];
}

export interface PhraseMatchOptions {
  readonly startTokenIndex?: number;
  readonly requireStartOfInput?: boolean;
  readonly requireEndOfInput?: boolean;
  readonly allowLeadingWakeWord?: boolean;
  readonly wakeWords?: readonly string[];
}

/**
 * Tokenizes the input command text deterministically.
 */
export function tokenizeCommandText(input: string): readonly CommandToken[] {
  const tokens: CommandToken[] = [];
  let i = 0;

  // Numbers: optional sign, grouping commas or digits, optional decimal
  const numberRegex = /^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?/u;
  // Words: letters/marks, optional internal apostrophe, optional internal hyphen to letters/digits
  const wordRegex = /^[\p{L}\p{M}]+(?:['’][\p{L}\p{M}]+|-(?:[\p{L}\p{M}]+|\d+))*/u;
  // Whitespace
  const whitespaceRegex = /^\s+/u;
  // Zero-width formatting characters (BOM, ZWSP, ZWNJ, ZWJ)
  const skipRegex = /^[\u200B-\u200D\uFEFF]+/u;

  while (i < input.length) {
    const remaining = input.slice(i);

    const wsMatch = remaining.match(whitespaceRegex);
    if (wsMatch) {
      i += wsMatch[0].length;
      continue;
    }

    const skipMatch = remaining.match(skipRegex);
    if (skipMatch) {
      i += skipMatch[0].length;
      continue;
    }

    const numMatch = remaining.match(numberRegex);
    if (numMatch) {
      const text = numMatch[0];
      let treatAsSigned = true;

      if (text.startsWith("+") || text.startsWith("-")) {
        if (tokens.length > 0) {
          const lastToken = tokens[tokens.length - 1];
          const hasSpaceBefore = lastToken.sourceSpan.endIndex < i;
          if (!hasSpaceBefore && (lastToken.kind === "number" || lastToken.kind === "word")) {
            treatAsSigned = false;
          }
        }
      }

      if (treatAsSigned) {
        tokens.push({
          kind: "number",
          sourceSpan: { startIndex: i, endIndex: i + text.length },
          originalText: text,
          comparisonText: text,
        });
        i += text.length;
        continue;
      }
    }

    const wordMatch = remaining.match(wordRegex);
    if (wordMatch) {
      const text = wordMatch[0];
      tokens.push({
        kind: "word",
        sourceSpan: { startIndex: i, endIndex: i + text.length },
        originalText: text,
        comparisonText: text.normalize("NFKC").toLowerCase(),
      });
      i += text.length;
      continue;
    }

    // Punctuation is one character (accounting for surrogates)
    const match = remaining.match(/^./su);
    if (match) {
      const text = match[0];
      tokens.push({
        kind: "punctuation",
        sourceSpan: { startIndex: i, endIndex: i + text.length },
        originalText: text,
        comparisonText: text,
      });
      i += text.length;
    } else {
      break;
    }
  }

  return tokens;
}

/**
 * Attempts to match a phrase pattern exactly at the given token index.
 */
export function matchPhraseAt(
  input: string,
  tokens: readonly CommandToken[],
  pattern: PhrasePattern,
  tokenIndex: number,
): PhraseMatch | undefined {
  if (tokenIndex < 0 || tokenIndex >= tokens.length) return undefined;
  if (pattern.words.length === 0) return undefined;

  let currentTokenIndex = tokenIndex;
  const matchedTokens: CommandToken[] = [];

  for (let i = 0; i < pattern.words.length; i++) {
    const expectedWord = pattern.words[i].normalize("NFKC").toLowerCase();

    // Optional comma separator between words
    if (i > 0 && pattern.allowCommaSeparators) {
      const possibleComma = tokens[currentTokenIndex];
      if (
        possibleComma &&
        possibleComma.kind === "punctuation" &&
        possibleComma.comparisonText === ","
      ) {
        matchedTokens.push(possibleComma);
        currentTokenIndex++;
      }
    }

    const token = tokens[currentTokenIndex];
    if (!token) return undefined;

    if (
      (token.kind !== "word" && token.kind !== "number") ||
      token.comparisonText !== expectedWord
    ) {
      return undefined;
    }

    matchedTokens.push(token);
    currentTokenIndex++;
  }

  // Check terminal punctuation
  if (pattern.allowTerminalPunctuation) {
    const nextToken = tokens[currentTokenIndex];
    if (
      nextToken &&
      nextToken.kind === "punctuation" &&
      [".", "!", "?"].includes(nextToken.comparisonText)
    ) {
      matchedTokens.push(nextToken);
      currentTokenIndex++;
    }
  }

  const firstToken = matchedTokens[0];
  const lastToken = matchedTokens[matchedTokens.length - 1];

  const sourceSpan = {
    startIndex: firstToken.sourceSpan.startIndex,
    endIndex: lastToken.sourceSpan.endIndex,
  };

  return {
    patternId: pattern.id,
    sourceSpan,
    originalText: input.slice(sourceSpan.startIndex, sourceSpan.endIndex),
    tokenStartIndex: tokenIndex,
    tokenEndIndex: currentTokenIndex,
    matchedTokens,
  };
}

/**
 * Finds all exact phrase matches for the given patterns, respecting options.
 */
export function findPhraseMatches(
  input: string,
  tokens: readonly CommandToken[],
  patterns: readonly PhrasePattern[],
  options?: PhraseMatchOptions,
): readonly PhraseMatch[] {
  const matches: PhraseMatch[] = [];
  const startIdx = options?.startTokenIndex ?? 0;
  if (startIdx < 0 || startIdx > tokens.length) return matches;

  const wakeWords = (options?.wakeWords ?? []).map((w) => w.normalize("NFKC").toLowerCase());

  for (const pattern of patterns) {
    if (!pattern.id || pattern.words.length === 0) continue;

    for (let i = startIdx; i < tokens.length; i++) {
      let phraseStartIndex = i;
      let wakeWordTokenIndex = -1;

      // Check for wake word if this is the start of the match we are considering
      if (options?.allowLeadingWakeWord && wakeWords.length > 0) {
        const currentToken = tokens[i];
        if (currentToken.kind === "word" && wakeWords.includes(currentToken.comparisonText)) {
          wakeWordTokenIndex = i;
          phraseStartIndex = i + 1;

          // Optional comma after wake word
          const nextToken = tokens[phraseStartIndex];
          if (nextToken && nextToken.kind === "punctuation" && nextToken.comparisonText === ",") {
            phraseStartIndex++;
          }
        }
      }

      const match = matchPhraseAt(input, tokens, pattern, phraseStartIndex);
      if (match) {
        let isValid = true;

        // Validate requireStartOfInput (leading punctuation is ignored)
        if (options?.requireStartOfInput) {
          const checkEnd = wakeWordTokenIndex !== -1 ? wakeWordTokenIndex : phraseStartIndex;
          for (let k = 0; k < checkEnd; k++) {
            if (tokens[k].kind === "word" || tokens[k].kind === "number") {
              isValid = false;
              break;
            }
          }
        }

        // Validate requireEndOfInput
        if (isValid && options?.requireEndOfInput) {
          if (match.tokenEndIndex < tokens.length) {
            isValid = false;
          }
        }

        if (isValid) {
          matches.push(match);
        }
      }
    }
  }

  // Remove exact duplicates
  const uniqueMatches: PhraseMatch[] = [];
  const seen = new Set<string>();
  for (const match of matches) {
    const key = `${match.patternId}:${match.sourceSpan.startIndex}:${match.sourceSpan.endIndex}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMatches.push(match);
    }
  }

  // Sorting
  const patternIndexMap = new Map<string, number>();
  patterns.forEach((p, idx) => {
    if (!patternIndexMap.has(p.id)) {
      patternIndexMap.set(p.id, idx);
    }
  });

  uniqueMatches.sort((a, b) => {
    if (a.sourceSpan.startIndex !== b.sourceSpan.startIndex) {
      return a.sourceSpan.startIndex - b.sourceSpan.startIndex;
    }
    const lenA = a.sourceSpan.endIndex - a.sourceSpan.startIndex;
    const lenB = b.sourceSpan.endIndex - b.sourceSpan.startIndex;
    if (lenA !== lenB) {
      return lenB - lenA;
    }
    const idxA = patternIndexMap.get(a.patternId) ?? 0;
    const idxB = patternIndexMap.get(b.patternId) ?? 0;
    if (idxA !== idxB) {
      return idxA - idxB;
    }
    if (a.patternId !== b.patternId) {
      return a.patternId.localeCompare(b.patternId, "en-US");
    }
    return 0;
  });

  return uniqueMatches;
}

function getWordTokenCount(match: PhraseMatch): number {
  let count = 0;
  for (const token of match.matchedTokens) {
    if (token.kind === "word" || token.kind === "number") {
      count++;
    }
  }
  return count;
}

/**
 * Selects the longest match deterministically.
 */
export function selectLongestPhraseMatch(matches: readonly PhraseMatch[]): PhraseMatch | undefined {
  if (matches.length === 0) return undefined;

  let best = matches[0];

  for (let i = 1; i < matches.length; i++) {
    const match = matches[i];

    const wordsBest = getWordTokenCount(best);
    const wordsMatch = getWordTokenCount(match);

    if (wordsMatch > wordsBest) {
      best = match;
      continue;
    }
    if (wordsMatch < wordsBest) continue;

    const spanBest = best.sourceSpan.endIndex - best.sourceSpan.startIndex;
    const spanMatch = match.sourceSpan.endIndex - match.sourceSpan.startIndex;

    if (spanMatch > spanBest) {
      best = match;
      continue;
    }
    if (spanMatch < spanBest) continue;

    if (match.sourceSpan.startIndex < best.sourceSpan.startIndex) {
      best = match;
      continue;
    }
    if (match.sourceSpan.startIndex > best.sourceSpan.startIndex) continue;

    if (match.patternId.localeCompare(best.patternId, "en-US") < 0) {
      best = match;
    }
  }

  return best;
}
