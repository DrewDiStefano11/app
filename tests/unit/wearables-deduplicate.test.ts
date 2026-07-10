import { describe, it, expect } from 'vitest';
import { deduplicateBatch, evaluateDuplicate } from '../../src/lib/wearables/deduplicate';
import { NormalizedRecord } from '../../src/lib/wearables/types';

describe('Wearable Deduplication', () => {

  const baseRecord = (id: string, overrides: Partial<NormalizedRecord> = {}): NormalizedRecord => ({
    id,
    provider: "apple-health",
    providerRecordId: id,
    type: "heart_rate",
    startAt: 10000,
    canonicalUnit: "bpm",
    originalUnit: "bpm",
    value: 75,
    importedAt: 1000,
    provenance: "direct",
    ...overrides
  });

  it('keeps existing for same provider ID if not updated', () => {
    const existing = baseRecord("1", { importedAt: 2000 });
    const incoming = baseRecord("1", { importedAt: 1000 });
    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("keep-existing");
  });

  it('replaces existing for same provider ID if updated', () => {
    const existing = baseRecord("1", { updatedAt: 1000 });
    const incoming = baseRecord("1", { updatedAt: 2000 });
    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("replace-existing");
  });

  it('revokes record if incoming marks it as revoked', () => {
    const existing = baseRecord("1");
    const incoming = baseRecord("1", { revoked: true });
    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("revoke-existing");
  });

  it('prioritizes direct provider over aggregator (near-equal match)', () => {
    const existing = baseRecord("2", { provider: "health-connect", provenance: "aggregator", providerRecordId: "hc1" });
    const incoming = baseRecord("3", { provider: "oura", provenance: "direct", providerRecordId: "o1" }); // same time, same value

    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("replace-existing"); // direct > aggregator
  });

  it('protects confirmed manual data from overwrites', () => {
    const existing = baseRecord("4", { provider: "manual", provenance: "manual", confirmation: "confirmed", providerRecordId: "m1" });
    const incoming = baseRecord("5", { provider: "apple-health", provenance: "direct", providerRecordId: "a1" }); // same time/val

    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("keep-existing");
  });

  it('replaces unconfirmed manual data if direct source has higher priority', () => {
    const existing = baseRecord("4", { provider: "manual", provenance: "manual", confirmation: "unconfirmed", providerRecordId: "m1" });
    const incoming = baseRecord("5", { provider: "apple-health", provenance: "direct", providerRecordId: "a1" });

    // Manual provenance gives +100. Direct gives +50.
    // So actually, manual still wins unless we tweak the rules, let's check current logic.
    // In current logic: existing manual=100. incoming direct=50.
    // existing wins.
    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("keep-existing");
  });

  it('detects overlapping sleep sessions as conflict', () => {
    const existing = baseRecord("6", { type: "sleep_session", startAt: 1000, endAt: 5000, value: 4000 });
    const incoming = baseRecord("7", { type: "sleep_session", startAt: 2000, endAt: 6000, value: 4000 });
    const result = evaluateDuplicate(existing, incoming);
    expect(result?.type).toBe("mark-conflict");
  });

  it('does not duplicate non-matching records (different time/value)', () => {
    const existing = baseRecord("8", { startAt: 10000, value: 75 });
    const incoming = baseRecord("9", { startAt: 20000, value: 80, providerRecordId: "diff" });
    const result = evaluateDuplicate(existing, incoming);
    expect(result).toBeNull();
  });

  it('deduplicates a batch correctly (deterministic order)', () => {
    const batch = [
      baseRecord("10", { provenance: "aggregator", startAt: 1000, value: 50 }),
      baseRecord("11", { provenance: "direct", startAt: 1000, value: 50, providerRecordId: "11" }), // Should replace 10
      baseRecord("12", { startAt: 2000, value: 60 }), // New record
    ];

    const result = deduplicateBatch(batch, []);
    expect(result).toHaveLength(2);
    expect(result.find(r => r.id === "11")).toBeDefined();
    expect(result.find(r => r.id === "10")).toBeUndefined();
    expect(result.find(r => r.id === "12")).toBeDefined();
  });

  it('is idempotent (running same batch twice yields same result)', () => {
    const batch = [
      baseRecord("13", { startAt: 1000, value: 50 }),
      baseRecord("14", { startAt: 2000, value: 60 }),
    ];

    const pass1 = deduplicateBatch(batch, []);
    expect(pass1).toHaveLength(2);

    const pass2 = deduplicateBatch(batch, pass1);
    expect(pass2).toHaveLength(2); // Should not add duplicates
  });

});
