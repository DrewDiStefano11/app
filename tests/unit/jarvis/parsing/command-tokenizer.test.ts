import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  tokenizeCommandText,
  matchPhraseAt,
  findPhraseMatches,
  selectLongestPhraseMatch,
} from "../../../../src/lib/jarvis/parsing/command-tokenizer";

describe("command-tokenizer", () => {
  describe("tokenizeCommandText", () => {
    it("tokenizes basic words", () => {
      const input = "start workout";
      const tokens = tokenizeCommandText(input);
      assert.equal(tokens.length, 2);
      assert.deepEqual(tokens[0], {
        kind: "word",
        sourceSpan: { startIndex: 0, endIndex: 5 },
        originalText: "start",
        comparisonText: "start",
      });
      assert.deepEqual(tokens[1], {
        kind: "word",
        sourceSpan: { startIndex: 6, endIndex: 13 },
        originalText: "workout",
        comparisonText: "workout",
      });
      assert.equal(
        input.slice(tokens[0].sourceSpan.startIndex, tokens[0].sourceSpan.endIndex),
        tokens[0].originalText,
      );
    });

    it("tokenizes uppercase and mixed case", () => {
      const tokens = tokenizeCommandText("START Workout");
      assert.equal(tokens.length, 2);
      assert.equal(tokens[0].comparisonText, "start");
      assert.equal(tokens[1].comparisonText, "workout");
    });

    it("handles whitespace correctly", () => {
      const inputs = ["start   workout", "start\tworkout", "start\nworkout", "start\r\nworkout"];
      for (const input of inputs) {
        const tokens = tokenizeCommandText(input);
        assert.equal(tokens.length, 2);
        assert.equal(tokens[0].originalText, "start");
        assert.equal(tokens[1].originalText, "workout");
      }
    });

    it("handles word boundaries", () => {
      const tokens = tokenizeCommandText("restart started starter");
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].comparisonText, "restart");
      assert.equal(tokens[1].comparisonText, "started");
      assert.equal(tokens[2].comparisonText, "starter");
    });

    it("handles apostrophes", () => {
      const tokens1 = tokenizeCommandText("don't");
      assert.equal(tokens1.length, 1);
      assert.equal(tokens1[0].comparisonText, "don't");

      const tokens2 = tokenizeCommandText("don’t");
      assert.equal(tokens2.length, 1);
      assert.equal(tokens2[0].comparisonText, "don’t");

      const tokens3 = tokenizeCommandText("user's");
      assert.equal(tokens3.length, 1);
      assert.equal(tokens3[0].comparisonText, "user's");

      const tokens4 = tokenizeCommandText("users’");
      assert.equal(tokens4.length, 2); // "users" + "’" since "’" is not between letters
      assert.equal(tokens4[0].comparisonText, "users");
      assert.equal(tokens4[1].comparisonText, "’");
    });

    it("handles hyphenated words", () => {
      const tokens = tokenizeCommandText("warm-up one-arm t-shirt start-workout");
      assert.equal(tokens.length, 4);
      assert.equal(tokens[0].comparisonText, "warm-up");
      assert.equal(tokens[1].comparisonText, "one-arm");
      assert.equal(tokens[2].comparisonText, "t-shirt");
      assert.equal(tokens[3].comparisonText, "start-workout");
    });

    it("handles number tokens", () => {
      const validNumbers = ["0", "5", "+5", "-5", "0.5", "12.75", "1,000", "1,000.50"];
      for (const text of validNumbers) {
        const tokens = tokenizeCommandText(text);
        assert.equal(tokens.length, 1, `Failed to parse number: ${text}`);
        assert.equal(tokens[0].kind, "number");
        assert.equal(tokens[0].originalText, text);
        assert.equal(tokens[0].comparisonText, text);
      }
    });

    it("handles binary operators without merging them into numbers", () => {
      const t1 = tokenizeCommandText("5-10");
      assert.equal(t1.length, 3);
      assert.equal(t1[0].comparisonText, "5");
      assert.equal(t1[1].comparisonText, "-");
      assert.equal(t1[2].comparisonText, "10");

      const t2 = tokenizeCommandText("5+10");
      assert.equal(t2.length, 3);
      assert.equal(t2[0].comparisonText, "5");
      assert.equal(t2[1].comparisonText, "+");
      assert.equal(t2[2].comparisonText, "10");
    });

    it("rejects malformed numbers", () => {
      const malformed = [".5", "5.", "1,00", "1.2.3", "1e3"];
      for (const text of malformed) {
        const tokens = tokenizeCommandText(text);
        assert.notEqual(tokens.length, 1, `Parsed malformed number as one token: ${text}`);
      }
    });

    it("handles punctuation", () => {
      const text = "start, (workout) stop! 1:30 ...";
      const tokens = tokenizeCommandText(text);

      const expectedOriginalTexts = [
        "start",
        ",",
        "(",
        "workout",
        ")",
        "stop",
        "!",
        "1",
        ":",
        "30",
        ".",
        ".",
        ".",
      ];
      assert.equal(tokens.length, expectedOriginalTexts.length);
      for (let i = 0; i < tokens.length; i++) {
        assert.equal(tokens[i].originalText, expectedOriginalTexts[i]);
      }
    });

    it("handles unicode comparison", () => {
      const tokens = tokenizeCommandText("ＣＯＮＴＩＮＵＥ café CAFÉ");
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].comparisonText, "continue");
      assert.equal(tokens[1].comparisonText, "café");
      assert.equal(tokens[2].comparisonText, "café");
      assert.equal(tokens[1].originalText, "café");
      assert.equal(tokens[2].originalText, "CAFÉ");
    });
  });

  describe("exact phrase matching", () => {
    it("matches exact phrases", () => {
      const input = "start workout";
      const tokens = tokenizeCommandText(input);
      const pattern = { id: "p1", words: ["start", "workout"] };

      const match = matchPhraseAt(input, tokens, pattern, 0);
      assert.ok(match);
      assert.equal(match!.patternId, "p1");
      assert.deepEqual(match!.sourceSpan, { startIndex: 0, endIndex: 13 });
      assert.equal(match!.originalText, "start workout");
      assert.equal(match!.matchedTokens.length, 2);
    });

    it("respects comma separators", () => {
      const input = "start, workout";
      const tokens = tokenizeCommandText(input);

      // Default: reject
      const pattern1 = { id: "p1", words: ["start", "workout"] };
      const match1 = matchPhraseAt(input, tokens, pattern1, 0);
      assert.equal(match1, undefined);

      // Allowed
      const pattern2 = {
        id: "p1",
        words: ["start", "workout"],
        allowCommaSeparators: true,
      };
      const match2 = matchPhraseAt(input, tokens, pattern2, 0);
      assert.ok(match2);
      assert.equal(match2!.originalText, "start, workout");

      // Others still rejected
      const inputs = ["start! workout", "start/workout", "start... workout"];
      for (const text of inputs) {
        const m = matchPhraseAt(text, tokenizeCommandText(text), pattern2, 0);
        assert.equal(m, undefined);
      }
    });

    it("respects terminal punctuation", () => {
      const input = "start workout!";
      const tokens = tokenizeCommandText(input);

      // Default: exclude
      const pattern1 = { id: "p1", words: ["start", "workout"] };
      const match1 = matchPhraseAt(input, tokens, pattern1, 0);
      assert.ok(match1);
      assert.equal(match1!.originalText, "start workout");

      // Allowed
      const pattern2 = {
        id: "p1",
        words: ["start", "workout"],
        allowTerminalPunctuation: true,
      };
      const match2 = matchPhraseAt(input, tokens, pattern2, 0);
      assert.ok(match2);
      assert.equal(match2!.originalText, "start workout!");
    });
  });

  describe("boundary constraints and wake word", () => {
    it("requireStartOfInput", () => {
      const pattern = { id: "p1", words: ["start", "workout"] };

      const m1 = findPhraseMatches(
        "start workout",
        tokenizeCommandText("start workout"),
        [pattern],
        { requireStartOfInput: true },
      );
      assert.equal(m1.length, 1);

      const m2 = findPhraseMatches(
        "please start workout",
        tokenizeCommandText("please start workout"),
        [pattern],
        { requireStartOfInput: true },
      );
      assert.equal(m2.length, 0);

      const m3 = findPhraseMatches(
        ", start workout",
        tokenizeCommandText(", start workout"),
        [pattern],
        { requireStartOfInput: true },
      );
      assert.equal(m3.length, 1);
    });

    it("requireEndOfInput", () => {
      const pattern = { id: "p1", words: ["start", "workout"] };
      const patternWithTerm = {
        id: "p1",
        words: ["start", "workout"],
        allowTerminalPunctuation: true,
      };

      const m1 = findPhraseMatches(
        "start workout",
        tokenizeCommandText("start workout"),
        [pattern],
        { requireEndOfInput: true },
      );
      assert.equal(m1.length, 1);

      const m2 = findPhraseMatches(
        "start workout!",
        tokenizeCommandText("start workout!"),
        [pattern],
        { requireEndOfInput: true },
      );
      assert.equal(m2.length, 0);

      const m2Term = findPhraseMatches(
        "start workout!",
        tokenizeCommandText("start workout!"),
        [patternWithTerm],
        { requireEndOfInput: true },
      );
      assert.equal(m2Term.length, 1);

      const m3 = findPhraseMatches(
        "start workout now",
        tokenizeCommandText("start workout now"),
        [pattern],
        { requireEndOfInput: true },
      );
      assert.equal(m3.length, 0);

      const m4 = findPhraseMatches(
        "start workout/",
        tokenizeCommandText("start workout/"),
        [pattern],
        { requireEndOfInput: true },
      );
      assert.equal(m4.length, 0);

      const m5 = findPhraseMatches(
        "start workout:",
        tokenizeCommandText("start workout:"),
        [pattern],
        { requireEndOfInput: true },
      );
      assert.equal(m5.length, 0);

      const m6 = findPhraseMatches(
        "start workout!!",
        tokenizeCommandText("start workout!!"),
        [patternWithTerm],
        { requireEndOfInput: true },
      );
      assert.equal(m6.length, 0);
    });

    it("allowLeadingWakeWord", () => {
      const pattern = { id: "p1", words: ["start", "workout"] };
      const options = {
        allowLeadingWakeWord: true,
        wakeWords: ["jarvis", "assistant"],
        requireStartOfInput: true,
      };

      const cases = ["Jarvis start workout", "Jarvis, start workout", "Assistant, start workout"];
      for (const c of cases) {
        const matches = findPhraseMatches(c, tokenizeCommandText(c), [pattern], options);
        assert.equal(matches.length, 1);
        assert.equal(matches[0].originalText, "start workout");
      }

      const m4 = findPhraseMatches(
        "please Jarvis start workout",
        tokenizeCommandText("please Jarvis start workout"),
        [pattern],
        options,
      );
      assert.equal(m4.length, 0);

      const patternTerm = { id: "p1", words: ["start", "workout"], allowTerminalPunctuation: true };
      const optionsTerm = { ...options, requireEndOfInput: true };
      const m5 = findPhraseMatches(
        "Jarvis, start workout!",
        tokenizeCommandText("Jarvis, start workout!"),
        [patternTerm],
        optionsTerm,
      );
      assert.equal(m5.length, 1);
    });
  });

  describe("longest match and multiple matches", () => {
    it("finds multiple matches", () => {
      const input = "start workout then pause timer";
      const tokens = tokenizeCommandText(input);
      const patterns = [
        { id: "p1", words: ["start"] },
        { id: "p2", words: ["start", "workout"] },
        { id: "p3", words: ["pause"] },
        { id: "p4", words: ["pause", "timer"] },
      ];

      const matches = findPhraseMatches(input, tokens, patterns);
      assert.equal(matches.length, 4);
    });

    it("selects longest match", () => {
      const patterns = [
        { id: "p1", words: ["start"] },
        { id: "p2", words: ["start", "workout"] },
        { id: "p3", words: ["start", "workout", "now"] },
      ];

      const input = "start workout now";
      const matches = findPhraseMatches(input, tokenizeCommandText(input), patterns);
      const best = selectLongestPhraseMatch(matches);

      assert.ok(best);
      assert.equal(best!.patternId, "p3");
    });
  });

  describe("duplicate protection", () => {
    it("does not return exact duplicate pattern ID and span matches", () => {
      const input = "start workout";
      const tokens = tokenizeCommandText(input);
      const pattern = { id: "p1", words: ["start", "workout"] };

      const matches = findPhraseMatches(input, tokens, [pattern, pattern, pattern]);
      assert.equal(matches.length, 1);
    });
  });

  describe("invalid and empty inputs", () => {
    it("handles empty input", () => {
      const tokens = tokenizeCommandText("");
      assert.equal(tokens.length, 0);
    });

    it("handles whitespace-only input", () => {
      const tokens = tokenizeCommandText("   \t\n  ");
      assert.equal(tokens.length, 0);
    });

    it("handles punctuation-only input", () => {
      const tokens = tokenizeCommandText("!?,.");
      assert.equal(tokens.length, 4);
    });

    it("handles empty token list", () => {
      const pattern = { id: "p1", words: ["start"] };
      const matches = findPhraseMatches("start", [], [pattern]);
      assert.equal(matches.length, 0);
    });

    it("handles empty pattern list", () => {
      const tokens = tokenizeCommandText("start");
      const matches = findPhraseMatches("start", tokens, []);
      assert.equal(matches.length, 0);
    });

    it("handles out-of-range start token index", () => {
      const tokens = tokenizeCommandText("start");
      const pattern = { id: "p1", words: ["start"] };
      const matches = findPhraseMatches("start", tokens, [pattern], {
        startTokenIndex: 5,
      });
      assert.equal(matches.length, 0);
    });

    it("handles pattern with no words", () => {
      const tokens = tokenizeCommandText("start");
      const pattern = { id: "p1", words: [] };
      const matches = findPhraseMatches("start", tokens, [pattern]);
      assert.equal(matches.length, 0);
    });

    it("handles pattern with empty ID", () => {
      const tokens = tokenizeCommandText("start");
      const pattern = { id: "", words: ["start"] };
      const matches = findPhraseMatches("start", tokens, [pattern]);
      assert.equal(matches.length, 0);
    });
  });

  describe("exact spans and purity", () => {
    it("maintains original source text based on spans", () => {
      const input = "  start   workout  ";
      const tokens = tokenizeCommandText(input);
      assert.equal(
        input.slice(tokens[0].sourceSpan.startIndex, tokens[0].sourceSpan.endIndex),
        tokens[0].originalText,
      );
      assert.equal(
        input.slice(tokens[1].sourceSpan.startIndex, tokens[1].sourceSpan.endIndex),
        tokens[1].originalText,
      );

      const pattern = { id: "p1", words: ["start", "workout"] };
      const matches = findPhraseMatches(input, tokens, [pattern]);
      assert.equal(matches.length, 1);
      const match = matches[0];
      assert.equal(
        input.slice(match.sourceSpan.startIndex, match.sourceSpan.endIndex),
        match.originalText,
      );
      assert.equal(match.originalText, "start   workout");
    });
  });
});
