import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseDurations } from "../../../../src/lib/jarvis/parsing/durations";

describe("Duration Parser - Full Suite", () => {
  it("parses millisecond aliases", () => {
    const cases = ["1 millisecond", "1 milliseconds", "1 ms"];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.warnings[0], "duration_parsed");
      assert.equal(res.durations.length, 1);
      assert.equal(res.durations[0].components[0].unit, "millisecond");
      assert.equal(res.durations[0].canonicalText, "1 ms");
      assert.equal(res.durations[0].totalMilliseconds, 1);
    }
  });

  it("parses second aliases", () => {
    const cases = ["1 second", "1 seconds", "1 sec", "1 secs"];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.durations[0].components[0].unit, "second");
      assert.equal(res.durations[0].canonicalText, "1 sec");
      assert.equal(res.durations[0].totalMilliseconds, 1000);
    }
  });

  it("parses minute aliases", () => {
    const cases = ["1 minute", "1 minutes", "1 min", "1 mins"];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.durations[0].components[0].unit, "minute");
      assert.equal(res.durations[0].canonicalText, "1 min");
      assert.equal(res.durations[0].totalMilliseconds, 60000);
    }
  });

  it("parses hour aliases", () => {
    const cases = ["1 hour", "1 hours", "1 hr", "1 hrs"];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.durations[0].components[0].unit, "hour");
      assert.equal(res.durations[0].canonicalText, "1 hr");
      assert.equal(res.durations[0].totalMilliseconds, 3600000);
    }
  });

  it("parses single-component durations", () => {
    const cases = [
      { input: "0 seconds", ms: 0 },
      { input: "30 seconds", ms: 30000 },
      { input: "500 milliseconds", ms: 500 },
      { input: "1 minute", ms: 60000 },
      { input: "2 hours", ms: 7200000 },
      { input: "1.5 minutes", ms: 90000 },
      { input: "0.25 hours", ms: 900000 },
      { input: "30seconds", ms: 30000 },
      { input: "500ms", ms: 500 },
    ];

    for (const c of cases) {
      const res = parseDurations(c.input);
      assert.equal(res.durations.length, 1);
      assert.equal(res.durations[0].totalMilliseconds, c.ms);
    }
  });

  it("handles numeric formatting", () => {
    const res1 = parseDurations("+30 seconds");
    assert.equal(res1.durations[0].totalMilliseconds, 30000);
    assert.equal(res1.durations[0].components[0].numericText, "+30");

    const res2 = parseDurations("1,000 milliseconds");
    assert.equal(res2.durations[0].totalMilliseconds, 1000);
    assert.equal(res2.durations[0].components[0].numericText, "1,000");

    const res3 = parseDurations("1.500 seconds");
    assert.equal(res3.durations[0].totalMilliseconds, 1500);
    assert.equal(res3.durations[0].components[0].numericText, "1.500");
  });

  it("rejects malformed numerics", () => {
    const cases = [
      "1,00 seconds",
      ".5 minutes",
      "5. seconds",
      "1e3 milliseconds",
      "1/2 minute",
      "5-10 seconds",
    ];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
    }
  });

  it("rejects ambiguous fractional milliseconds", () => {
    const res = parseDurations("0.0005 seconds");
    assert.equal(res.durations.length, 0);
    assert.ok(res.warnings.includes("ambiguous_duration"));
  });

  it("parses valid compound durations", () => {
    const cases = [
      { input: "1 hour 30 minutes", ms: 5400000, parts: 2 },
      { input: "1 hour and 30 minutes", ms: 5400000, parts: 2 },
      { input: "1 hour, 30 minutes", ms: 5400000, parts: 2 },
      { input: "1 hour, 30 minutes, and 5 seconds", ms: 5405000, parts: 3 },
      { input: "2 minutes 10 seconds", ms: 130000, parts: 2 },
      { input: "10 seconds 500 milliseconds", ms: 10500, parts: 2 },
    ];

    for (const c of cases) {
      const res = parseDurations(c.input);
      assert.equal(res.durations.length, 1, `Failed for input: ${c.input}`);
      assert.equal(res.durations[0].components.length, c.parts);
      assert.equal(res.durations[0].totalMilliseconds, c.ms);
    }
  });

  it("handles decimal rules in compounds", () => {
    const valid = [
      { input: "1.5 hours", ms: 5400000 },
      { input: "0.5 minutes", ms: 30000 },
      { input: "1 hour 0.5 minutes", ms: 3630000 },
      { input: "30.5 seconds", ms: 30500 },
    ];
    for (const c of valid) {
      const res = parseDurations(c.input);
      assert.equal(res.durations.length, 1);
      assert.equal(res.durations[0].totalMilliseconds, c.ms);
    }

    const invalid = ["1.5 hours 30 minutes", "2.5 minutes 10 seconds"];
    for (const c of invalid) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
      assert.ok(res.warnings.includes("ambiguous_duration"));
    }
  });

  it("rejects invalid ordering", () => {
    const invalid = ["30 seconds 1 minute", "500 milliseconds 1 second", "1 minute 1 hour"];
    for (const c of invalid) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
      assert.ok(res.warnings.includes("ambiguous_duration"));
    }
  });

  it("rejects duplicate units", () => {
    const invalid = ["1 minute 30 seconds 10 seconds", "1 hour 2 hours"];
    for (const c of invalid) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
      assert.ok(res.warnings.includes("ambiguous_duration"));
    }
  });

  it("parses multiple independent durations", () => {
    const res1 = parseDurations("work for 30 seconds, rest for 1 minute");
    assert.equal(res1.durations.length, 2);
    assert.equal(res1.durations[0].totalMilliseconds, 30000);
    assert.equal(res1.durations[1].totalMilliseconds, 60000);

    const res2 = parseDurations("30 seconds work and 1 minute rest");
    assert.equal(res2.durations.length, 2);
    assert.equal(res2.durations[0].totalMilliseconds, 30000);
    assert.equal(res2.durations[1].totalMilliseconds, 60000);
  });

  it("respects range limits", () => {
    const valid = [
      { input: "24 hours", ms: 86400000 },
      { input: "23 hours 59 minutes 59 seconds 999 milliseconds", ms: 86399999 },
    ];
    for (const c of valid) {
      const res = parseDurations(c.input);
      assert.equal(res.durations.length, 1);
      assert.equal(res.durations[0].totalMilliseconds, c.ms);
    }

    const outOfRange = ["24 hours 1 millisecond", "25 hours", "1,500 minutes"];
    for (const c of outOfRange) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
      assert.ok(res.warnings.includes("duration_out_of_range"));
    }
  });

  it("protects clock times", () => {
    const cases = ["1:30", "5:00", "12:45 PM"];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
      assert.ok(res.warnings.includes("ambiguous_duration"));
    }

    const res2 = parseDurations("at 5:30 for 20 minutes");
    assert.equal(res2.durations.length, 1);
    assert.equal(res2.durations[0].totalMilliseconds, 1200000);
    assert.ok(res2.warnings.includes("ambiguous_duration"));
  });

  it("protects boundary matching", () => {
    const cases = [
      "secondhand",
      "hourglass",
      "millisecondsworth",
      "minute-by-minute",
      "30-second timer",
      "5-minute rest",
    ];
    for (const c of cases) {
      const res = parseDurations(c);
      assert.equal(res.durations.length, 0);
    }
  });

  it("is case insensitive but preserves original text", () => {
    const res = parseDurations("30 SECONDS");
    assert.equal(res.durations.length, 1);
    assert.equal(res.durations[0].originalText, "30 SECONDS");
    const res2 = parseDurations("2 Hours");
    assert.equal(res2.durations[0].originalText, "2 Hours");
    const res3 = parseDurations("500 MS");
    assert.equal(res3.durations[0].originalText, "500 MS");
  });

  it("generates exact source spans", () => {
    const input = "wait 1 hour, 30 minutes, then go";
    const res = parseDurations(input);
    const dur = res.durations[0];

    assert.equal(input.slice(dur.sourceSpan.startIndex, dur.sourceSpan.endIndex), dur.originalText);
    assert.equal(dur.originalText, "1 hour, 30 minutes");

    for (const comp of dur.components) {
      assert.equal(
        input.slice(comp.sourceSpan.startIndex, comp.sourceSpan.endIndex),
        comp.originalText,
      );
      assert.equal(
        input.slice(comp.numericSourceSpan.startIndex, comp.numericSourceSpan.endIndex),
        comp.numericText,
      );
      const unitPart = input.slice(comp.unitSourceSpan.startIndex, comp.unitSourceSpan.endIndex);
      assert.ok(unitPart.toLowerCase().startsWith(comp.unit.slice(0, 3))); // e.g. min, sec
    }
  });
});
