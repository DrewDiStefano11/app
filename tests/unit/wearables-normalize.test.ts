import { describe, it, expect } from "vitest";
import { normalizeRecord, normalizeBatch, RawRecord } from "../../src/lib/wearables/normalize";
import { SleepSessionPayload, WorkoutSessionPayload } from "../../src/lib/wearables/types";

describe("Wearable Normalization", () => {
  it("1. normalizes each supported provider", () => {
    const providers = [
      "apple-health",
      "health-connect",
      "whoop",
      "garmin",
      "fitbit",
      "oura",
      "manual",
    ];
    for (const p of providers) {
      const raw: RawRecord = { id: p, provider: p, type: "steps", startAt: 1000, value: 50 };
      const { record, error } = normalizeRecord(raw);
      expect(error).toBeUndefined();
      expect(record?.provider).toBe(p);
    }
  });

  it("2. accepts unknown provider but issues warning and sets low confidence", () => {
    const raw: RawRecord = {
      id: "u1",
      provider: "alien-tech",
      type: "steps",
      startAt: 1000,
      value: 50,
    };
    const { record, error, warning } = normalizeRecord(raw);
    expect(error).toBeUndefined();
    expect(record?.provider).toBe("unknown");
    expect(record?.confidence).toBe("low");
    expect(warning).toContain("Provider is unknown");
  });

  it("3. normalizes each supported record type", () => {
    const types = [
      "heart_rate",
      "resting_heart_rate",
      "heart_rate_variability",
      "steps",
      "active_calories",
      "total_calories",
      "sleep_session",
      "sleep_stages",
      "respiratory_rate",
      "temperature",
      "spo2",
      "workout_session",
      "distance",
      "elevation",
      "weight",
      "body_fat_percentage",
    ];
    for (const t of types) {
      let value: number | undefined = 50;
      let payload: unknown = undefined;
      if (t === "sleep_stages") {
        value = undefined;
        payload = [{ stage: "light", start: 1000, end: 2000 }];
      } else if (t === "workout_session") {
        value = undefined;
        payload = { workoutType: "run" };
      } else if (t === "temperature") {
        value = 37;
      } // Fix upper bound issue since 50 is above max temp

      const raw: RawRecord = { id: t, provider: "apple", type: t, startAt: 1000, value, payload };
      const { record, error } = normalizeRecord(raw);
      expect(error, `Failed on type ${t}`).toBeUndefined();
      expect(record?.type).toBe(t);
    }
  });

  it("4. rejects unknown record type", () => {
    const raw: RawRecord = {
      id: "x",
      provider: "apple",
      type: "brainwaves",
      startAt: 1000,
      value: 50,
    };
    const { error } = normalizeRecord(raw);
    expect(error).toBe("unsupported_record_type");
  });

  it("5-15. converts canonical units correctly", () => {
    // 6. kg to lb
    expect(
      normalizeRecord({ id: "1", type: "weight", startAt: 100, value: 80, unit: "kg" }).record
        ?.value,
    ).toBeCloseTo(176.37, 2);
    // 7. miles to meters
    expect(
      normalizeRecord({ id: "2", type: "distance", startAt: 100, value: 1, unit: "mi" }).record
        ?.value,
    ).toBeCloseTo(1609.34, 2);
    // 8. km to meters
    expect(
      normalizeRecord({ id: "3", type: "distance", startAt: 100, value: 1, unit: "km" }).record
        ?.value,
    ).toBe(1000);
    // 9. feet to meters
    expect(
      normalizeRecord({ id: "4", type: "elevation", startAt: 100, value: 10, unit: "ft" }).record
        ?.value,
    ).toBeCloseTo(3.048, 3);
    // 10. fahrenheit to celsius
    expect(
      normalizeRecord({ id: "5", type: "temperature", startAt: 100, value: 98.6, unit: "F" }).record
        ?.value,
    ).toBeCloseTo(37, 1);
    // 11. joules to kcal
    expect(
      normalizeRecord({ id: "6", type: "active_calories", startAt: 100, value: 4184, unit: "j" })
        .record?.value,
    ).toBe(1);
    // 12. kilojoules to kcal
    expect(
      normalizeRecord({ id: "7", type: "total_calories", startAt: 100, value: 4.184, unit: "kj" })
        .record?.value,
    ).toBe(1);
    // 13. seconds to milliseconds (HRV)
    expect(
      normalizeRecord({
        id: "8",
        type: "heart_rate_variability",
        startAt: 100,
        value: 0.05,
        unit: "sec",
      }).record?.value,
    ).toBe(50);
    // 14. minutes to milliseconds (sleep duration)
    expect(
      normalizeRecord({ id: "9", type: "sleep_session", startAt: 100, value: 60, unit: "min" })
        .record?.value,
    ).toBe(3600000);
    // 15. fractional to percent (SpO2)
    expect(
      normalizeRecord({ id: "10", type: "spo2", startAt: 100, value: 0.98, unit: "fraction" })
        .record?.value,
    ).toBe(98);
  });

  it("16. issues missing-unit warning but accepts", () => {
    const raw: RawRecord = {
      id: "u2",
      provider: "apple",
      type: "steps",
      startAt: 1000,
      value: 5000,
    };
    const { record, error, warning } = normalizeRecord(raw);
    expect(error).toBeUndefined();
    expect(warning).toContain("Missing unit");
    expect(record?.canonicalUnit).toBe("unknown");
  });

  it("18. rejects incompatible unit", () => {
    const raw: RawRecord = {
      id: "u4",
      provider: "apple",
      type: "weight",
      startAt: 1000,
      value: 50,
      unit: "bpm",
    };
    const { error, message } = normalizeRecord(raw);
    expect(error).toBe("incompatible_unit");
    expect(message).toContain("Incompatible unit: bpm");
  });

  it("19. rejects non-finite values", () => {
    const raw: RawRecord = {
      id: "f1",
      provider: "apple",
      type: "heart_rate",
      startAt: 1000,
      value: NaN,
      unit: "bpm",
    };
    expect(normalizeRecord(raw).error).toBe("non_finite_value");
  });

  it("20. rejects lower corruption bound", () => {
    const raw: RawRecord = {
      id: "b1",
      provider: "apple",
      type: "steps",
      startAt: 1000,
      value: -10,
      unit: "count",
    };
    expect(normalizeRecord(raw).error).toBe("below_minimum");
  });

  it("21. rejects upper corruption bound", () => {
    const raw: RawRecord = {
      id: "b2",
      provider: "apple",
      type: "heart_rate",
      startAt: 1000,
      value: 500,
      unit: "bpm",
    };
    expect(normalizeRecord(raw).error).toBe("above_maximum");
  });

  it("22. rejects invalid timestamp", () => {
    const raw: RawRecord = {
      id: "t1",
      provider: "apple",
      type: "steps",
      startAt: -100,
      value: 100,
    };
    expect(normalizeRecord(raw).error).toBe("invalid_timestamp");
  });

  it("23. rejects end-before-start", () => {
    const raw: RawRecord = {
      id: "t2",
      provider: "apple",
      type: "steps",
      startAt: 1000,
      endAt: 500,
      value: 100,
    };
    expect(normalizeRecord(raw).error).toBe("end_before_start");
  });

  it("24. drops sleep stage outside session (but keeps valid ones)", () => {
    const raw: RawRecord = {
      id: "s1",
      provider: "whoop",
      type: "sleep_stages",
      startAt: 1000,
      endAt: 5000,
      payload: [
        { stage: "light", start: 500, end: 1500 }, // outside bounds
        { stage: "deep", start: 2000, end: 3000 }, // valid
      ],
    };
    const { record } = normalizeRecord(raw);
    const p = record?.payload as SleepSessionPayload;
    expect(p.stages).toHaveLength(1);
    expect(p.stages?.[0].stage).toBe("deep");
  });

  it("25. detects overlapping sleep stages", () => {
    const raw: RawRecord = {
      id: "s2",
      provider: "whoop",
      type: "sleep_stages",
      startAt: 1000,
      endAt: 5000,
      payload: [
        { stage: "light", start: 1000, end: 3000 },
        { stage: "deep", start: 2500, end: 4000 },
      ],
    };
    const { record } = normalizeRecord(raw);
    const p = record?.payload as SleepSessionPayload;
    expect(p.hasOverlap).toBe(true);
  });

  it("26. handles structured workout session", () => {
    const raw: RawRecord = {
      id: "w1",
      provider: "apple",
      type: "workout_session",
      startAt: 1000,
      endAt: 5000,
      payload: { workoutType: "running", duration: 4000, calories: 300 },
    };
    const { record } = normalizeRecord(raw);
    const p = record?.payload as WorkoutSessionPayload;
    expect(p.workoutType).toBe("running");
    expect(p.calories).toBe(300);
  });

  it("28. preserves provenance", () => {
    const raw: RawRecord = {
      id: "p1",
      provider: "apple",
      type: "steps",
      startAt: 1000,
      value: 100,
      sourceDevice: "Watch",
      sourceApp: "Health",
      confidence: "high",
      confirmation: "confirmed",
      provenance: "direct",
      metadata: { key: "val" },
    };
    const { record } = normalizeRecord(raw);
    expect(record?.sourceDevice).toBe("Watch");
    expect(record?.confidence).toBe("high");
    expect(record?.metadata?.key).toBe("val");
  });

  it("29. uses deterministic clock output", () => {
    const raw: RawRecord = {
      id: "d1",
      provider: "apple",
      type: "steps",
      startAt: 1000,
      value: 100,
    };
    const { record } = normalizeRecord(raw, { normalizedAt: 123456789 });
    expect(record?.importedAt).toBe(123456789);
  });

  it("30. is idempotent", () => {
    const raw: RawRecord = {
      id: "i1",
      provider: "apple",
      type: "steps",
      startAt: 1000,
      value: 100,
      unit: "count",
    };
    const res1 = normalizeRecord(raw, { normalizedAt: 1000 });
    const res2 = normalizeRecord(raw, { normalizedAt: 1000 });
    expect(res1.record).toEqual(res2.record);
  });

  it("31. processes mixed batch", () => {
    const batch = [
      { id: "m1", provider: "apple", type: "steps", startAt: 1000, value: 100, unit: "count" },
      { id: "m2", provider: "apple", type: "steps", startAt: 1000, value: -100, unit: "count" }, // invalid value
      { id: "m3", provider: "apple", type: "steps", startAt: -100, value: 100, unit: "count" }, // invalid timestamp
    ];
    const res = normalizeBatch(batch, { normalizedAt: 1000 });
    expect(res.accepted).toHaveLength(1);
    expect(res.rejected).toHaveLength(2);
    expect(res.rejected[0].reason).toBe("below_minimum");
    expect(res.rejected[1].reason).toBe("invalid_timestamp");
  });
});
