import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { normalizeSpokenNumbers } from "../../../../src/lib/jarvis/normalization/spoken-numbers.js";

describe("Spoken Number Normalization", () => {
  describe("Basic cardinal tests", () => {
    it("normalizes zero through nineteen", () => {
      assert.equal(normalizeSpokenNumbers("zero").normalizedText, "0");
      assert.equal(normalizeSpokenNumbers("twelve").normalizedText, "12");
      assert.equal(normalizeSpokenNumbers("nineteen").normalizedText, "19");
    });

    it("normalizes tens", () => {
      assert.equal(normalizeSpokenNumbers("twenty").normalizedText, "20");
      assert.equal(normalizeSpokenNumbers("ninety").normalizedText, "90");
    });

    it("normalizes tens with units", () => {
      assert.equal(normalizeSpokenNumbers("twenty one").normalizedText, "21");
      assert.equal(normalizeSpokenNumbers("ninety nine").normalizedText, "99");
    });

    it("normalizes hundreds", () => {
      assert.equal(normalizeSpokenNumbers("one hundred").normalizedText, "100");
      assert.equal(normalizeSpokenNumbers("one hundred five").normalizedText, "105");
      assert.equal(normalizeSpokenNumbers("two hundred twenty five").normalizedText, "225");
    });

    it("normalizes hundreds with optional 'and'", () => {
      assert.equal(normalizeSpokenNumbers("one hundred and five").normalizedText, "105");
    });

    it("normalizes thousands", () => {
      assert.equal(normalizeSpokenNumbers("one thousand").normalizedText, "1000");
      assert.equal(
        normalizeSpokenNumbers("twelve thousand three hundred forty five").normalizedText,
        "12345",
      );
      assert.equal(
        normalizeSpokenNumbers("nine hundred ninety nine thousand nine hundred ninety nine")
          .normalizedText,
        "999999",
      );
    });
  });

  describe("Case-insensitive matching", () => {
    it("handles uppercase and mixed case", () => {
      assert.equal(normalizeSpokenNumbers("TWELVE").normalizedText, "12");
      assert.equal(normalizeSpokenNumbers("Two Hundred").normalizedText, "200");
      assert.equal(normalizeSpokenNumbers("nEgAtIvE fIvE").normalizedText, "-5");
    });

    it("leaves unaffected casing exact", () => {
      assert.equal(normalizeSpokenNumbers("Do TWELVE reps!").normalizedText, "Do 12 reps!");
    });
  });

  describe("Decimal forms", () => {
    it("normalizes explicit decimal phrases", () => {
      assert.equal(normalizeSpokenNumbers("one point five").normalizedText, "1.5");
      assert.equal(normalizeSpokenNumbers("zero point zero five").normalizedText, "0.05");
      assert.equal(normalizeSpokenNumbers("twelve point seven five").normalizedText, "12.75");
    });

    it("preserves spoken trailing zeroes", () => {
      const res = normalizeSpokenNumbers("one hundred point five zero");
      assert.equal(res.normalizedText, "100.50");
      assert.equal(res.replacements[0].numericValue, 100.5);
    });

    it("does not allow tens after point", () => {
      assert.equal(
        normalizeSpokenNumbers("one point twenty five").normalizedText,
        "one point twenty five",
      );
    });
  });
  describe("Negative numbers", () => {
    it("normalizes negative phrases", () => {
      assert.equal(normalizeSpokenNumbers("negative five").normalizedText, "-5");
      assert.equal(normalizeSpokenNumbers("negative one hundred twenty").normalizedText, "-120");
      assert.equal(normalizeSpokenNumbers("negative zero point five").normalizedText, "-0.5");
    });

    it("leaves unrelated negative words unchanged", () => {
      assert.equal(normalizeSpokenNumbers("negative").normalizedText, "negative");
      assert.equal(
        normalizeSpokenNumbers("negative negative five").normalizedText,
        "negative negative five",
      );
    });
  });

  describe("Hyphenated forms", () => {
    it("normalizes hyphenated tens", () => {
      assert.equal(normalizeSpokenNumbers("twenty-one").normalizedText, "21");
      assert.equal(normalizeSpokenNumbers("ninety-nine").normalizedText, "99");
      assert.equal(normalizeSpokenNumbers("one hundred twenty-five").normalizedText, "125");
    });

    it("preserves unrelated hyphenated words", () => {
      assert.equal(normalizeSpokenNumbers("warm-up").normalizedText, "warm-up");
      assert.equal(normalizeSpokenNumbers("one-arm row").normalizedText, "one-arm row");
      assert.equal(normalizeSpokenNumbers("twenty-one-style").normalizedText, "twenty-one-style");
    });
  });

  describe("Existing numeric text", () => {
    it("preserves exact existing numbers", () => {
      assert.equal(normalizeSpokenNumbers("225").normalizedText, "225");
      assert.equal(normalizeSpokenNumbers("12.5").normalizedText, "12.5");
      assert.equal(normalizeSpokenNumbers("-5").normalizedText, "-5");
      assert.equal(normalizeSpokenNumbers("1,000").normalizedText, "1,000");
    });

    it("does not combine adjacent existing numbers with spoken text", () => {
      // 20 five should not become 25, it should become 20 5
      assert.equal(normalizeSpokenNumbers("20 five").normalizedText, "20 5");
    });
  });
  describe("Ambiguous phrases", () => {
    it("leaves ambiguous number sequences unchanged", () => {
      assert.equal(normalizeSpokenNumbers("one two three").normalizedText, "one two three");
      assert.equal(normalizeSpokenNumbers("one thirty").normalizedText, "one thirty");
      assert.equal(normalizeSpokenNumbers("ten twelve").normalizedText, "ten twelve");
      assert.equal(normalizeSpokenNumbers("twenty five six").normalizedText, "twenty five six");
      assert.equal(normalizeSpokenNumbers("one point").normalizedText, "one point");
      assert.equal(normalizeSpokenNumbers("zero zero").normalizedText, "zero zero");
    });
  });

  describe("Unsupported constructions", () => {
    it("leaves unsupported grammar unchanged", () => {
      assert.equal(normalizeSpokenNumbers("one million").normalizedText, "one million");
      assert.equal(normalizeSpokenNumbers("a hundred").normalizedText, "a hundred");
      // "one half" is an unsupported fraction. Actually, the instruction says "Do not interpret fractions such as 'one half'".
      // This means we shouldn't turn it into 0.5. Turning it into "1 half" is exactly what "two plates" -> "2 plates" does.
      // Wait, let's look at the instruction again.
      // "Unsupported constructions Test: one million, a hundred, one half, first, twenty-first, five minus two. Confirm they remain unchanged"
      // Ah! "Confirm they remain unchanged". It explicitly says "one half" must remain unchanged.
      assert.equal(normalizeSpokenNumbers("one half").normalizedText, "one half");
      assert.equal(normalizeSpokenNumbers("first").normalizedText, "first");
      assert.equal(normalizeSpokenNumbers("twenty-first").normalizedText, "twenty-first");
      assert.equal(normalizeSpokenNumbers("five minus two").normalizedText, "five minus two");
      assert.equal(normalizeSpokenNumbers("one hundredth").normalizedText, "one hundredth");

      // Check negative zero point five numeric value
      const res = normalizeSpokenNumbers("negative zero point five");
      assert.equal(res.replacements[0].numericValue, -0.5);
    });
  });

  describe("Whole-word matching", () => {
    it("does not match substrings inside words", () => {
      assert.equal(normalizeSpokenNumbers("someone").normalizedText, "someone");
      assert.equal(normalizeSpokenNumbers("tone").normalizedText, "tone");
      assert.equal(normalizeSpokenNumbers("alone").normalizedText, "alone");
      assert.equal(normalizeSpokenNumbers("none").normalizedText, "none");
      assert.equal(normalizeSpokenNumbers("money").normalizedText, "money");
    });
  });

  describe("Multiple replacements & source spans", () => {
    it("applies multiple valid non-overlapping replacements", () => {
      const input = "do twelve reps at two hundred twenty five pounds";
      const res = normalizeSpokenNumbers(input);
      assert.equal(res.normalizedText, "do 12 reps at 225 pounds");
      assert.equal(res.replacements.length, 2);

      const r1 = res.replacements[0];
      assert.equal(r1.numericValue, 12);
      assert.equal(r1.originalText, "twelve");
      assert.equal(input.slice(r1.sourceSpan.startIndex, r1.sourceSpan.endIndex), "twelve");

      const r2 = res.replacements[1];
      assert.equal(r2.numericValue, 225);
      assert.equal(r2.originalText, "two hundred twenty five");
      assert.equal(
        input.slice(r2.sourceSpan.startIndex, r2.sourceSpan.endIndex),
        "two hundred twenty five",
      );

      assert.ok(r1.sourceSpan.endIndex <= r2.sourceSpan.startIndex, "Spans must be ascending");
    });
  });

  describe("Warning behavior", () => {
    it("emits number_normalized", () => {
      const res = normalizeSpokenNumbers("twelve reps");
      assert.deepEqual(res.warnings, ["number_normalized"]);
    });

    it("emits ambiguous_number_phrase", () => {
      const res = normalizeSpokenNumbers("one two");
      assert.deepEqual(res.warnings, ["ambiguous_number_phrase"]);
    });

    it("emits unsupported_number_phrase", () => {
      const res = normalizeSpokenNumbers("one million");
      assert.deepEqual(res.warnings, ["unsupported_number_phrase"]);
    });

    it("stable deterministic warning order", () => {
      const res = normalizeSpokenNumbers("do twelve reps and one million dollars for one two");
      assert.deepEqual(res.warnings, [
        "number_normalized",
        "ambiguous_number_phrase",
        "unsupported_number_phrase",
      ]);
    });
  });

  describe("Idempotence & Scope protection", () => {
    it("is idempotent", () => {
      const input = "twenty-one reps at negative five point five";
      const first = normalizeSpokenNumbers(input);
      const second = normalizeSpokenNumbers(first.normalizedText);
      assert.equal(second.normalizedText, first.normalizedText);
    });

    it("does not implement later behavior", () => {
      assert.equal(
        normalizeSpokenNumbers("one minute thirty seconds").normalizedText,
        "1 minute 30 seconds",
      );
      assert.equal(normalizeSpokenNumbers("two plates").normalizedText, "2 plates");
      assert.equal(
        normalizeSpokenNumbers("start a timer for five").normalizedText,
        "start a timer for 5",
      );
      assert.equal(
        normalizeSpokenNumbers("Jarvis log ten reps").normalizedText,
        "Jarvis log 10 reps",
      );
      assert.equal(normalizeSpokenNumbers("bench press").normalizedText, "bench press");
    });
  });

  describe("Purity and immutability", () => {
    it("is pure and deep equals on repeat", () => {
      const input = "twelve";
      const res1 = normalizeSpokenNumbers(input);
      const res2 = normalizeSpokenNumbers(input);
      assert.deepEqual(res1, res2);
      assert.notEqual(res1.replacements, res2.replacements); // New array reference
    });
  });
});
