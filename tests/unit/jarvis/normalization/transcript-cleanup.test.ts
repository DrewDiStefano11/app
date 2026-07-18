import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { cleanTranscript } from "../../../../src/lib/jarvis/normalization/transcript-cleanup.js";

describe("Transcript Cleanup", () => {
  describe("Basic behavior", () => {
    it("handles empty input", () => {
      const result = cleanTranscript("");
      assert.equal(result.originalText, "");
      assert.equal(result.normalizedText, "");
      assert.equal(result.hasMeaningfulText, false);
      assert.deepEqual(result.warnings, ["no_meaningful_text"]);
    });

    it("handles ordinary lowercase command", () => {
      const input = "start workout";
      const result = cleanTranscript(input);
      assert.equal(result.originalText, input);
      assert.equal(result.normalizedText, input);
      assert.equal(result.hasMeaningfulText, true);
      assert.equal(result.warnings, undefined);
    });

    it("handles mixed-case command", () => {
      const input = "Start Workout";
      const result = cleanTranscript(input);
      assert.equal(result.originalText, input);
      assert.equal(result.normalizedText, "start workout");
      assert.equal(result.hasMeaningfulText, true);
      assert.deepEqual(result.warnings, ["case_normalized"]);
    });
  });

  describe("Whitespace", () => {
    it("handles leading spaces", () => {
      const result = cleanTranscript("  start");
      assert.equal(result.normalizedText, "start");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });

    it("handles trailing spaces", () => {
      const result = cleanTranscript("start  ");
      assert.equal(result.normalizedText, "start");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });

    it("handles repeated spaces", () => {
      const result = cleanTranscript("start   workout");
      assert.equal(result.normalizedText, "start workout");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });

    it("handles tabs, carriage returns, line feeds", () => {
      const result = cleanTranscript("start\tworkout\r\nnow");
      assert.equal(result.normalizedText, "start workout now");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });

    it("handles non-breaking spaces and narrow non-breaking spaces", () => {
      const result = cleanTranscript("start\u00A0workout\u202Fnow");
      assert.equal(result.normalizedText, "start workout now");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });

    it("handles Unicode em spaces", () => {
      const result = cleanTranscript("start\u2003workout");
      assert.equal(result.normalizedText, "start workout");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });

    it("handles combinations of multiple whitespace forms", () => {
      const result = cleanTranscript("  \n\t start \u00A0 \r\n workout  ");
      assert.equal(result.normalizedText, "start workout");
      assert.deepEqual(result.warnings, ["whitespace_normalized"]);
    });
  });

  describe("Control characters", () => {
    it("removes embedded null character", () => {
      const result = cleanTranscript("start\x00workout");
      assert.equal(result.normalizedText, "startworkout");
      assert.deepEqual(result.warnings, ["control_characters_removed"]);
    });

    it("removes embedded escape/control characters", () => {
      const result = cleanTranscript("start\x1Bworkout");
      assert.equal(result.normalizedText, "startworkout");
      assert.deepEqual(result.warnings, ["control_characters_removed"]);
    });

    it("handles controls surrounded by valid words", () => {
      const result = cleanTranscript("start \x1F workout");
      assert.equal(result.normalizedText, "start workout");
      assert.deepEqual(result.warnings, ["whitespace_normalized", "control_characters_removed"]);
    });

    it("handles control-only input", () => {
      const result = cleanTranscript("\x00\x1F\x1B");
      assert.equal(result.normalizedText, "");
      assert.equal(result.hasMeaningfulText, false);
      assert.deepEqual(result.warnings, ["control_characters_removed", "no_meaningful_text"]);
    });
  });

  describe("Zero-width characters", () => {
    it("removes zero-width space between words", () => {
      const result = cleanTranscript("start\u200Bworkout");
      assert.equal(result.normalizedText, "startworkout");
      assert.deepEqual(result.warnings, ["zero_width_characters_removed"]);
    });

    it("removes zero-width joiner and non-joiner", () => {
      const result = cleanTranscript("a\u200Db\u200Cc");
      assert.equal(result.normalizedText, "abc");
      assert.deepEqual(result.warnings, ["zero_width_characters_removed"]);
    });

    it("removes embedded byte-order mark and directional marks", () => {
      const result = cleanTranscript("\uFEFFstart\u200Eworkout\u200F");
      assert.equal(result.normalizedText, "startworkout");
      assert.deepEqual(result.warnings, ["zero_width_characters_removed"]);
    });

    it("handles transcript containing only invisible formatting characters", () => {
      const result = cleanTranscript("\u200B\uFEFF\u200D");
      assert.equal(result.normalizedText, "");
      assert.equal(result.hasMeaningfulText, false);
      assert.deepEqual(result.warnings, ["zero_width_characters_removed", "no_meaningful_text"]);
    });
  });

  describe("Unicode normalization", () => {
    it("normalizes full-width Latin letters", () => {
      const result = cleanTranscript("ｓｔａｒｔ");
      assert.equal(result.normalizedText, "start");
      assert.deepEqual(result.warnings, ["unicode_normalized"]);
    });

    it("normalizes full-width numbers", () => {
      const result = cleanTranscript("１２３");
      assert.equal(result.normalizedText, "123");
      assert.deepEqual(result.warnings, ["unicode_normalized"]);
    });

    it("normalizes compatibility characters", () => {
      // ﬃ -> ffi
      const result = cleanTranscript("e\uFB03cient");
      assert.equal(result.normalizedText, "efficient");
      assert.deepEqual(result.warnings, ["unicode_normalized"]);
    });

    it("maintains accented words as meaningful", () => {
      const result = cleanTranscript("café");
      assert.equal(result.normalizedText, "café");
      assert.equal(result.hasMeaningfulText, true);
    });

    it("normalizes composed and decomposed Unicode text deterministically", () => {
      const composed = "é"; // \u00E9
      const decomposed = "e\u0301";
      const resultC = cleanTranscript(composed);
      const resultD = cleanTranscript(decomposed);
      assert.equal(resultC.normalizedText, "é");
      assert.equal(resultD.normalizedText, "é");
      assert.equal(resultD.warnings?.includes("unicode_normalized"), true);
    });
  });

  describe("Punctuation", () => {
    it("normalizes smart apostrophes and quotes", () => {
      const result = cleanTranscript("\u2018don\u2019t \u201Cstop\u201D");
      assert.equal(result.normalizedText, "'don't \"stop\"");
      assert.deepEqual(result.warnings, ["punctuation_normalized"]);
    });

    it("normalizes dashes and ellipsis", () => {
      const result = cleanTranscript("warm\u2013up \u2014 fast\u2026");
      assert.equal(result.normalizedText, "warm-up - fast...");
      assert.deepEqual(result.warnings, ["punctuation_normalized"]);
    });

    it("preserves decimal values, time-like text, and hyphens", () => {
      const result = cleanTranscript("225.5 pounds at 1:30 warm-up");
      assert.equal(result.normalizedText, "225.5 pounds at 1:30 warm-up");
      assert.equal(result.warnings, undefined);
    });

    it("handles punctuation-only input", () => {
      const result = cleanTranscript("... - ' \"");
      assert.equal(result.normalizedText, "... - ' \"");
      assert.equal(result.hasMeaningfulText, false);
      assert.deepEqual(result.warnings, ["no_meaningful_text"]);
    });
  });

  describe("Case normalization", () => {
    it("lowercases uppercase ASCII", () => {
      const result = cleanTranscript("START");
      assert.equal(result.normalizedText, "start");
      assert.deepEqual(result.warnings, ["case_normalized"]);
    });

    it("lowercases mixed case", () => {
      const result = cleanTranscript("StArT");
      assert.equal(result.normalizedText, "start");
      assert.deepEqual(result.warnings, ["case_normalized"]);
    });

    it("lowercases Unicode letters", () => {
      const result = cleanTranscript("CAFÉ");
      assert.equal(result.normalizedText, "café");
      assert.deepEqual(result.warnings, ["case_normalized"]);
    });

    it("produces identical output on repeated execution", () => {
      const r1 = cleanTranscript("START");
      const r2 = cleanTranscript(r1.normalizedText);
      assert.equal(r1.normalizedText, r2.normalizedText);
      assert.equal(r2.warnings, undefined);
    });
  });

  describe("Meaningful text", () => {
    it("empty string is not meaningful", () => {
      assert.equal(cleanTranscript("").hasMeaningfulText, false);
    });

    it("spaces are not meaningful", () => {
      assert.equal(cleanTranscript("   ").hasMeaningfulText, false);
    });

    it("punctuation-only is not meaningful", () => {
      assert.equal(cleanTranscript("...").hasMeaningfulText, false);
    });

    it("ASCII words are meaningful", () => {
      assert.equal(cleanTranscript("start").hasMeaningfulText, true);
    });

    it("Unicode words are meaningful", () => {
      assert.equal(cleanTranscript("résumé").hasMeaningfulText, true);
    });

    it("numeric-only input is meaningful", () => {
      assert.equal(cleanTranscript("225").hasMeaningfulText, true);
    });

    it("mixed number and punctuation is meaningful", () => {
      assert.equal(cleanTranscript("225.5...").hasMeaningfulText, true);
    });
  });

  describe("Warning behavior", () => {
    it("no warnings for already normalized text", () => {
      const result = cleanTranscript("start workout 225.5");
      assert.equal(result.warnings, undefined);
    });

    it("each warning appears exactly once and only when transformations occur", () => {
      // ｓ - full width (unicode)
      // \t - tab (whitespace)
      // \x00 - null (control)
      // \u200B - zwsp (zero width)
      // \u201C - quote (punctuation)
      // Ｔ - full width uppercase (unicode + case)
      const result = cleanTranscript(" ｓ\t\x00\u200B\u201CＴ ");

      // Expected: "s "t " -> "s \"t" -> wait, ｓ becomes s. Ｔ becomes T.
      // After unicode: " s\t\x00\u200B\u201CT " -> unicode_normalized
      // After ws: " s \x00\u200B\u201CT " -> whitespace_normalized
      // After control: " s \u200B\u201CT " -> control_characters_removed
      // After zw: " s \u201CT " -> zero_width_characters_removed
      // After punct: " s \"T " -> punctuation_normalized
      // After case: " s \"t " -> case_normalized
      // Final trim: "s \"t" -> whitespace_normalized (already added)

      assert.equal(result.normalizedText, 's "t');
      assert.deepEqual(result.warnings, [
        "unicode_normalized",
        "whitespace_normalized",
        "control_characters_removed",
        "zero_width_characters_removed",
        "punctuation_normalized",
        "case_normalized",
      ]);
    });

    it("punctuation-only includes no_meaningful_text", () => {
      const result = cleanTranscript(" \u2013 \u2026 ");
      assert.deepEqual(result.warnings, [
        "whitespace_normalized",
        "punctuation_normalized",
        "no_meaningful_text",
      ]);
    });

    it("identical inputs produce identical warning arrays", () => {
      const input = "\u2018START\u2019";
      const r1 = cleanTranscript(input);
      const r2 = cleanTranscript(input);
      assert.deepEqual(r1.warnings, r2.warnings);
    });
  });

  describe("Idempotence", () => {
    it("is idempotent for representative inputs", () => {
      const input = "  \u2018ＳＴＡＲＴ\u2019 \t \u200B \x00 225.5\u2026  ";
      const r1 = cleanTranscript(input);
      const r2 = cleanTranscript(r1.normalizedText);

      assert.equal(r1.normalizedText, r2.normalizedText);
      assert.equal(r1.hasMeaningfulText, r2.hasMeaningfulText);
      assert.equal(r2.warnings, undefined);
    });
  });

  describe("Scope protection", () => {
    it("retains numbers as text rather than parsing them", () => {
      const result = cleanTranscript("two hundred twenty five");
      assert.equal(result.normalizedText, "two hundred twenty five");
    });

    it("retains duration as text rather than parsing it", () => {
      const result = cleanTranscript("one minute thirty seconds");
      assert.equal(result.normalizedText, "one minute thirty seconds");
    });

    it("retains wake-word", () => {
      const result = cleanTranscript("Jarvis, start workout");
      assert.equal(result.normalizedText, "jarvis, start workout");
    });

    it("retains unresolved phrases", () => {
      const result = cleanTranscript("bench press");
      assert.equal(result.normalizedText, "bench press");
    });

    it("retains command phrases as text", () => {
      const result = cleanTranscript("start a timer");
      assert.equal(result.normalizedText, "start a timer");
    });
  });

  describe("Immutability and purity", () => {
    it("repeated calls return deeply equal values", () => {
      const input = "  START  ";
      const r1 = cleanTranscript(input);
      const r2 = cleanTranscript(input);
      assert.deepEqual(r1, r2);
    });
  });
});
