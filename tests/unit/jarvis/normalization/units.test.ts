import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { normalizeUnits } from "../../../../src/lib/jarvis/normalization/units.js";

describe("Jarvis Unit Normalization", () => {
  describe("Count Units", () => {
    it("normalizes rep aliases", () => {
      const inputs = ["12 rep", "12 reps", "12 repetition", "12 repetitions"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "12 rep");
        assert.equal(result.quantities.length, 1);
        assert.equal(result.quantities[0]?.canonicalUnit, "rep");
        assert.equal(result.quantities[0]?.category, "count");
      }
    });

    it("normalizes set aliases", () => {
      const inputs = ["3 set", "3 sets"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "3 set");
        assert.equal(result.quantities[0]?.canonicalUnit, "set");
        assert.equal(result.quantities[0]?.category, "count");
      }
    });
  });

  describe("Weight Units", () => {
    it("normalizes pound aliases", () => {
      const inputs = ["225 lb", "225 lbs", "225 pound", "225 pounds"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "225 lb");
        assert.equal(result.quantities[0]?.canonicalUnit, "lb");
        assert.equal(result.quantities[0]?.category, "weight");
      }
    });

    it("normalizes kilogram aliases", () => {
      const inputs = ["5 kg", "5 kgs", "5 kilogram", "5 kilograms", "5 kilo", "5 kilos"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "5 kg");
        assert.equal(result.quantities[0]?.canonicalUnit, "kg");
        assert.equal(result.quantities[0]?.category, "weight");
      }
    });
  });

  describe("Time Units", () => {
    it("normalizes second aliases", () => {
      const inputs = ["30 sec", "30 secs", "30 second", "30 seconds"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "30 sec");
        assert.equal(result.quantities[0]?.canonicalUnit, "sec");
        assert.equal(result.quantities[0]?.category, "time");
      }
    });

    it("normalizes minute aliases", () => {
      const inputs = ["5 min", "5 mins", "5 minute", "5 minutes"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "5 min");
        assert.equal(result.quantities[0]?.canonicalUnit, "min");
        assert.equal(result.quantities[0]?.category, "time");
      }
    });

    it("normalizes hour aliases", () => {
      const inputs = ["1 hr", "1 hrs", "1 hour", "1 hours"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "1 hr");
        assert.equal(result.quantities[0]?.canonicalUnit, "hr");
        assert.equal(result.quantities[0]?.category, "time");
      }
    });
  });

  describe("Distance Units", () => {
    it("normalizes meter aliases", () => {
      const inputs = ["100 meter", "100 meters", "100 metre", "100 metres"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "100 m");
        assert.equal(result.quantities[0]?.canonicalUnit, "m");
        assert.equal(result.quantities[0]?.category, "distance");
      }
    });

    it("normalizes kilometer aliases", () => {
      const inputs = ["5 km", "5 kilometer", "5 kilometers", "5 kilometre", "5 kilometres"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "5 km");
        assert.equal(result.quantities[0]?.canonicalUnit, "km");
        assert.equal(result.quantities[0]?.category, "distance");
      }
    });

    it("normalizes mile aliases", () => {
      const inputs = ["2.5 mi", "2.5 mile", "2.5 miles"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, "2.5 mi");
        assert.equal(result.quantities[0]?.canonicalUnit, "mi");
        assert.equal(result.quantities[0]?.category, "distance");
      }
    });
  });

  describe("Numeric Grammar", () => {
    it("supports zero and positive integers", () => {
      assert.equal(normalizeUnits("0 lbs").normalizedText, "0 lb");
      assert.equal(normalizeUnits("5 lbs").normalizedText, "5 lb");
      assert.equal(normalizeUnits("225 lbs").normalizedText, "225 lb");
    });

    it("supports explicit plus sign", () => {
      const result = normalizeUnits("+5 lbs");
      assert.equal(result.normalizedText, "+5 lb");
      assert.equal(result.quantities[0]?.numericValue, 5);
      assert.equal(result.quantities[0]?.numericText, "+5");
    });

    it("supports negative integers", () => {
      const result = normalizeUnits("-225 lbs");
      assert.equal(result.normalizedText, "-225 lb");
      assert.equal(result.quantities[0]?.numericValue, -225);
    });

    it("supports decimals and trailing zeroes", () => {
      const result = normalizeUnits("12.75 lbs");
      assert.equal(result.normalizedText, "12.75 lb");
      assert.equal(result.quantities[0]?.numericValue, 12.75);

      const resultZero = normalizeUnits("5.00 lbs");
      assert.equal(resultZero.normalizedText, "5.00 lb");
      assert.equal(resultZero.quantities[0]?.numericValue, 5);
      assert.equal(resultZero.quantities[0]?.numericText, "5.00");
    });

    it("supports negative decimals", () => {
      assert.equal(normalizeUnits("-2.5 miles").normalizedText, "-2.5 mi");
    });

    it("supports comma-grouped integers", () => {
      const result = normalizeUnits("1,000 lbs");
      assert.equal(result.normalizedText, "1,000 lb");
      assert.equal(result.quantities[0]?.numericValue, 1000);
      assert.equal(result.quantities[0]?.numericText, "1,000");

      assert.equal(normalizeUnits("12,500 lbs").normalizedText, "12,500 lb");
      assert.equal(normalizeUnits("999,999 lbs").normalizedText, "999,999 lb");
    });

    it("supports comma-grouped decimals", () => {
      const result = normalizeUnits("12,500.50 lbs");
      assert.equal(result.normalizedText, "12,500.50 lb");
      assert.equal(result.quantities[0]?.numericValue, 12500.5);
    });

    it("ignores invalid commas", () => {
      const inputs = ["1,00 lbs", "12,50 lbs", "1,0000 lbs", ",500 lbs", "500, lbs"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, input);
        assert.equal(result.quantities.length, 0);
      }
    });

    it("ignores malformed decimals", () => {
      const inputs = [".5 lbs", "5. lbs", "1.2.3 lbs"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, input);
        assert.equal(result.quantities.length, 0);
      }
    });

    it("ignores unsupported formats", () => {
      const inputs = [
        "1e3 pounds",
        "0x10 pounds",
        "1/2 mile",
        "5:30 minutes",
        "20% reps",
        "5-10 reps",
      ];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, input);
        assert.equal(result.quantities.length, 0);
      }
    });
  });

  describe("Spacing and Attachment", () => {
    it("preserves multiple spaces and tabs", () => {
      assert.equal(normalizeUnits("225   pounds").normalizedText, "225   lb");
      assert.equal(normalizeUnits("12\treps").normalizedText, "12\trep");
      assert.equal(normalizeUnits("225\npounds").normalizedText, "225\nlb");
    });

    it("handles directly attached units", () => {
      assert.equal(normalizeUnits("225lbs").normalizedText, "225lb");
      assert.equal(normalizeUnits("5kg").normalizedText, "5kg");
      assert.equal(normalizeUnits("30secs").normalizedText, "30sec");
      assert.equal(normalizeUnits("2.5miles").normalizedText, "2.5mi");
    });
  });

  describe("Punctuation Boundaries", () => {
    it("handles trailing punctuation", () => {
      assert.equal(normalizeUnits("225 pounds,").normalizedText, "225 lb,");
      assert.equal(normalizeUnits("12 reps!").normalizedText, "12 rep!");
      assert.equal(normalizeUnits("30 seconds.").normalizedText, "30 sec.");
      assert.equal(normalizeUnits("(5 kilograms)").normalizedText, "(5 kg)");
    });

    it("does not consume punctuation into spans", () => {
      const result = normalizeUnits("12 reps!");
      const q = result.quantities[0]!;
      assert.equal(q.originalText, "12 reps");
      assert.equal(q.sourceSpan.endIndex, 7); // Input "12 reps!" -> "12 reps" is length 7
    });
  });

  describe("Case Behavior", () => {
    it("is case-insensitive for units", () => {
      assert.equal(normalizeUnits("225 LBS").normalizedText, "225 lb");
      assert.equal(normalizeUnits("5 Kilograms").normalizedText, "5 kg");
      assert.equal(normalizeUnits("12 REPS").normalizedText, "12 rep");
    });

    it("does not alter surrounding case", () => {
      assert.equal(normalizeUnits("DO 12 REPS NOW").normalizedText, "DO 12 rep NOW");
    });
  });

  describe("Scope Protection and Exclusions", () => {
    it("ignores non-numeric quantities", () => {
      assert.equal(
        normalizeUnits("two hundred twenty five pounds").normalizedText,
        "two hundred twenty five pounds",
      );
    });

    it("does not aggregate duration", () => {
      assert.equal(normalizeUnits("1 hour 30 minutes").normalizedText, "1 hr 30 min");
    });

    it("does not convert weights", () => {
      assert.equal(normalizeUnits("225 pounds").normalizedText, "225 lb");
    });

    it("ignores command-words without numeric association", () => {
      assert.equal(normalizeUnits("set the timer").normalizedText, "set the timer");
      assert.equal(normalizeUnits("reset the workout").normalizedText, "reset the workout");
      assert.equal(normalizeUnits("repetition matters").normalizedText, "repetition matters");
      assert.equal(normalizeUnits("pound the pavement").normalizedText, "pound the pavement");
      assert.equal(normalizeUnits("second place").normalizedText, "second place");
      assert.equal(normalizeUnits("mile marker").normalizedText, "mile marker");
    });

    it("ignores whole words that contain unit strings", () => {
      assert.equal(normalizeUnits("12 representatives").normalizedText, "12 representatives");
      assert.equal(normalizeUnits("30 secondhand").normalizedText, "30 secondhand");
      assert.equal(normalizeUnits("2 mileage").normalizedText, "2 mileage");
      assert.equal(normalizeUnits("5 kilogramsworth").normalizedText, "5 kilogramsworth");
      assert.equal(normalizeUnits("settings").normalizedText, "settings");
    });

    it("ignores hyphenated adjectives", () => {
      assert.equal(normalizeUnits("225-pound bench").normalizedText, "225-pound bench");
      assert.equal(normalizeUnits("5-mile run").normalizedText, "5-mile run");
    });
  });

  describe("Ambiguous Aliases", () => {
    it("does not normalize ambiguous single-letter aliases but adds warning", () => {
      const inputs = ["5 m", "10 s", "2 h"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, input);
        assert.equal(result.quantities.length, 0);
        assert.deepEqual(result.warnings, ["ambiguous_unit_alias"]);
      }
    });

    it("does not add warning for ambiguous aliases without numbers", () => {
      const inputs = ["m", "s", "h", "run 5 km and m"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        // Note: "run 5 km and m" will normalize to "run 5 km and m" with unit_normalized warning, but no ambiguous warning.
        assert.equal(result.warnings.includes("ambiguous_unit_alias"), false);
      }
    });
  });

  describe("Unsupported Units", () => {
    it("does not normalize unsupported units but adds warning", () => {
      const inputs = ["5 ounces", "2 stone", "10 yards", "6 feet"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, input);
        assert.equal(result.quantities.length, 0);
        assert.deepEqual(result.warnings, ["unsupported_unit"]);
      }
    });

    it("does not add warning for arbitrary words", () => {
      const inputs = ["5 exercises", "3 workouts", "2 bananas"];
      for (const input of inputs) {
        const result = normalizeUnits(input);
        assert.equal(result.normalizedText, input);
        assert.equal(result.quantities.length, 0);
        assert.equal(result.warnings.length, 0);
      }
    });
  });

  describe("Multiple Quantities", () => {
    it("normalizes multiple independent quantities in order", () => {
      const input = "3 sets of 12 reps at 225 pounds for 30 seconds";
      const result = normalizeUnits(input);
      assert.equal(result.normalizedText, "3 set of 12 rep at 225 lb for 30 sec");
      assert.equal(result.quantities.length, 4);
      assert.equal(result.replacements.length, 4);

      assert.equal(result.quantities[0]?.canonicalUnit, "set");
      assert.equal(result.quantities[1]?.canonicalUnit, "rep");
      assert.equal(result.quantities[2]?.canonicalUnit, "lb");
      assert.equal(result.quantities[3]?.canonicalUnit, "sec");

      // Verify ascending non-overlapping spans
      for (let i = 0; i < result.quantities.length - 1; i++) {
        assert.ok(
          result.quantities[i]!.sourceSpan.endIndex <=
            result.quantities[i + 1]!.sourceSpan.startIndex,
        );
      }
    });
  });

  describe("Spans correctness", () => {
    it("verifies exact spans cover correctly", () => {
      const input = "I lifted 225   lbs today.";
      const result = normalizeUnits(input);
      const q = result.quantities[0]!;

      assert.equal(input.slice(q.sourceSpan.startIndex, q.sourceSpan.endIndex), "225   lbs");
      assert.equal(
        input.slice(q.numericSourceSpan.startIndex, q.numericSourceSpan.endIndex),
        "225",
      );
      assert.equal(input.slice(q.unitSourceSpan.startIndex, q.unitSourceSpan.endIndex), "lbs");
    });
  });

  describe("Warning Order and Uniqueness", () => {
    it("produces deterministic warning order and avoids duplicates", () => {
      const input = "5 m, 2 stone, 10 lbs, 5 m, 12 kgs";
      const result = normalizeUnits(input);
      assert.deepEqual(result.warnings, [
        "unit_normalized",
        "ambiguous_unit_alias",
        "unsupported_unit",
      ]);
    });

    it("does not generate unit_normalized if unit spelling is already canonical", () => {
      const input = "225 lb";
      const result = normalizeUnits(input);
      assert.equal(result.normalizedText, "225 lb");
      assert.equal(result.quantities.length, 1);
      assert.deepEqual(result.warnings, []);
    });
  });

  describe("Idempotence and Purity", () => {
    it("is idempotent", () => {
      const input = "3 sets of 12.5 reps at 225 LBS";
      const first = normalizeUnits(input);
      const second = normalizeUnits(first.normalizedText);

      assert.equal(first.normalizedText, "3 set of 12.5 rep at 225 lb");
      assert.equal(second.normalizedText, first.normalizedText);
      assert.equal(second.quantities.length, first.quantities.length);
      assert.deepEqual(second.warnings, []); // Second pass should have no normalization warnings
    });

    it("does not mutate original input", () => {
      const input = "5 kgs";
      const result = normalizeUnits(input);
      assert.equal(input, "5 kgs");
      assert.equal(result.originalText, "5 kgs");
    });
  });
});
