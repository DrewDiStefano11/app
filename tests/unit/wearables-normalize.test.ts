import { describe, it, expect } from 'vitest';
import { normalizeRecord, normalizeBatch, RawRecord } from '../../src/lib/wearables/normalize';
import { WearableRecordType } from '../../src/lib/wearables/types';

describe('Wearable Normalization', () => {
  it('normalizes basic heart rate record', () => {
    const raw: RawRecord = {
      id: "1",
      provider: "apple",
      type: "heart_rate",
      startAt: 1000,
      value: 75,
      unit: "bpm"
    };
    const { record, error } = normalizeRecord(raw);
    expect(error).toBeUndefined();
    expect(record?.provider).toBe("apple-health");
    expect(record?.type).toBe("heart_rate");
    expect(record?.value).toBe(75);
    expect(record?.canonicalUnit).toBe("bpm");
  });

  it('handles unknown provider and type', () => {
    const raw: RawRecord = { id: "2", provider: "alien-tech", type: "brainwaves", startAt: 1000, value: 50 };
    const { error: providerError } = normalizeRecord(raw);
    expect(providerError).toBe("Unknown or missing provider");

    const raw2: RawRecord = { id: "3", provider: "whoop", type: "brainwaves", startAt: 1000, value: 50 };
    const { error: typeError } = normalizeRecord(raw2);
    expect(typeError).toBe("Unknown or missing record type");
  });

  it('rejects invalid timestamps', () => {
    const raw: RawRecord = { id: "4", provider: "oura", type: "steps", startAt: -100, value: 5000 };
    const { error } = normalizeRecord(raw);
    expect(error).toBe("Invalid start timestamp");

    const rawEnd: RawRecord = { id: "5", provider: "oura", type: "steps", startAt: 1000, endAt: 500, value: 5000 };
    const { error: endError } = normalizeRecord(rawEnd);
    expect(endError).toBe("Invalid end timestamp");
  });

  it('converts units correctly (kg to lb, c to f, mi to m, etc.)', () => {
    // Weight kg -> lb
    const kgRaw: RawRecord = { id: "6", provider: "garmin", type: "weight", startAt: 1000, value: 80, unit: "kg" };
    const { record: kgRec } = normalizeRecord(kgRaw);
    expect(kgRec?.value).toBeCloseTo(80 * 2.20462, 1);
    expect(kgRec?.canonicalUnit).toBe("lb");

    // Temperature F -> C
    const tempRaw: RawRecord = { id: "7", provider: "oura", type: "temperature", startAt: 1000, value: 98.6, unit: "F" };
    const { record: tempRec } = normalizeRecord(tempRaw);
    expect(tempRec?.value).toBeCloseTo(37, 1);
    expect(tempRec?.canonicalUnit).toBe("celsius");

    // Distance mi -> meters
    const distRaw: RawRecord = { id: "8", provider: "garmin", type: "distance", startAt: 1000, value: 1, unit: "mi" };
    const { record: distRec } = normalizeRecord(distRaw);
    expect(distRec?.value).toBeCloseTo(1609.34, 1);
    expect(distRec?.canonicalUnit).toBe("meters");

    // HRV sec -> ms
    const hrvRaw: RawRecord = { id: "9", provider: "apple", type: "heart_rate_variability", startAt: 1000, value: 0.05, unit: "sec" };
    const { record: hrvRec } = normalizeRecord(hrvRaw);
    expect(hrvRec?.value).toBe(50);
    expect(hrvRec?.canonicalUnit).toBe("ms");
  });

  it('rejects non-finite and out of bounds values', () => {
    const raw: RawRecord = { id: "10", provider: "fitbit", type: "heart_rate", startAt: 1000, value: NaN };
    expect(normalizeRecord(raw).error).toBe("Non-finite value");

    const raw2: RawRecord = { id: "11", provider: "fitbit", type: "steps", startAt: 1000, value: -50 };
    expect(normalizeRecord(raw2).error).toContain("out of physiological bounds");

    const raw3: RawRecord = { id: "12", provider: "fitbit", type: "spo2", startAt: 1000, value: 150 };
    expect(normalizeRecord(raw3).error).toContain("out of physiological bounds");
  });

  it('normalizes sleep sessions without stages', () => {
    const raw: RawRecord = { id: "13", provider: "garmin", type: "sleep_session", startAt: 1000, endAt: 9000, value: 8000 };
    const { record, error } = normalizeRecord(raw);
    expect(error).toBeUndefined();
    expect(record?.type).toBe("sleep_session");
    expect(record?.value).toBe(8000);
  });

  it('normalizes valid sleep stages', () => {
    const raw: RawRecord = {
      id: "14", provider: "whoop", type: "sleep_stages", startAt: 1000, endAt: 5000,
      payload: [
        { stage: "light", start: 1000, end: 2000 },
        { stage: "deep", start: 2000, end: 3000 },
        { stage: "REM", start: 3000, end: 4000 },
        { stage: "awake", start: 4000, end: 5000 }
      ]
    };
    const { record, error } = normalizeRecord(raw);
    expect(error).toBeUndefined();
    expect(record?.payload.stages).toHaveLength(4);
    expect(record?.payload.stages[0].stage).toBe("light");
    expect(record?.payload.totalDurationMs).toBe(4000);
    expect(record?.payload.hasOverlap).toBe(false);
  });

  it('filters out invalid or overlapping sleep stages', () => {
    const raw: RawRecord = {
      id: "15", provider: "whoop", type: "sleep_stages", startAt: 1000, endAt: 5000,
      payload: [
        { stage: "light", start: 500, end: 1500 }, // start before session
        { stage: "deep", start: 2000, end: 6000 }, // end after session
        { stage: "rem", start: 3000, end: 2000 }, // invalid duration
      ]
    };
    const { record, error } = normalizeRecord(raw);
    expect(error).toBe("Invalid or missing sleep stages payload"); // All stages filtered out
  });

  it('normalizes workout session', () => {
    const raw: RawRecord = {
      id: "16", provider: "apple", type: "workout_session", startAt: 1000, endAt: 5000,
      payload: { workoutType: "running", duration: 4000, distance: 5000, calories: 300, averageHeartRate: 150 }
    };
    const { record, error } = normalizeRecord(raw);
    expect(error).toBeUndefined();
    expect(record?.payload.workoutType).toBe("running");
    expect(record?.payload.calories).toBe(300);
  });

  it('preserves metadata and provenance', () => {
    const raw: RawRecord = {
      id: "17", provider: "apple", type: "steps", startAt: 1000, value: 500,
      sourceDevice: "Apple Watch", sourceApp: "Health",
      confidence: "high", confirmation: "confirmed", provenance: "direct",
      metadata: { foo: "bar" }
    };
    const { record } = normalizeRecord(raw);
    expect(record?.sourceDevice).toBe("Apple Watch");
    expect(record?.provenance).toBe("direct");
    expect(record?.metadata?.foo).toBe("bar");
  });

  it('processes batch normalization correctly (partial failures)', () => {
    const batch = [
      { id: "18", provider: "apple", type: "steps", startAt: 1000, value: 500 }, // valid
      { id: "19", provider: "apple", type: "steps", startAt: 1000, value: -500 }, // invalid value
      { id: "20", provider: "apple", type: "steps", startAt: -1000, value: 500 }, // invalid timestamp
    ];

    const result = normalizeBatch(batch);
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(2);
    expect(result.accepted[0].id).toBe("18");
  });
});
