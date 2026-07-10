import { NormalizedRecord, DeduplicationResolution } from "./types";

function getPriority(record: NormalizedRecord): number {
  let score = 0;

  // Provenance Priority
  if (record.provenance === "manual") score += 100;
  else if (record.provenance === "direct") score += 50;
  else if (record.provenance === "aggregator") score += 10;

  // Confirmation Priority
  if (record.confirmation === "confirmed") score += 30;

  // Confidence Priority
  if (record.confidence === "high") score += 5;
  else if (record.confidence === "medium") score += 3;
  else if (record.confidence === "low") score += 1;

  return score;
}

function areRecordsNearEqual(a: NormalizedRecord, b: NormalizedRecord): boolean {
  if (a.type !== b.type) return false;
  if (a.canonicalUnit !== b.canonicalUnit) return false;

  // Overlapping timestamps (within 1 min for point-in-time, overlap for ranges)
  if (a.endAt && b.endAt) {
    if (a.startAt >= b.endAt || b.startAt >= a.endAt) return false;
  } else {
    if (Math.abs(a.startAt - b.startAt) > 60000) return false;
  }

  // Value equivalence (allow small drift)
  if (a.value !== undefined && b.value !== undefined) {
    const diff = Math.abs(a.value - b.value);
    const maxDiff = Math.max(a.value, b.value) * 0.05; // 5% tolerance
    if (diff > maxDiff && diff > 1) return false;
  } else if (a.value !== b.value) {
    return false; // one has value, other doesn't
  }

  return true;
}

export function evaluateDuplicate(
  existing: NormalizedRecord,
  incoming: NormalizedRecord
): DeduplicationResolution | null {
  // 1. Same Provider ID
  if (
    existing.provider === incoming.provider &&
    existing.providerRecordId &&
    existing.providerRecordId === incoming.providerRecordId
  ) {
    if (incoming.revoked) {
      return {
        type: "revoke-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Incoming record marks existing provider record as revoked"
      };
    }

    const existingUpdate = existing.updatedAt || existing.importedAt;
    const incomingUpdate = incoming.updatedAt || incoming.importedAt;

    if (incomingUpdate > existingUpdate) {
      return {
        type: "replace-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Incoming record is a newer version from the same provider"
      };
    } else {
      return {
        type: "keep-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Existing record is newer or same version from the same provider"
      };
    }
  }

  // 2. Cross-Provider Linkage (Not fully implemented, placeholder logic)
  if (incoming.metadata?.linkedProviderRecordId === existing.id) {
     return {
        type: "replace-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Explicit cross-provider linkage replace"
     };
  }

  // 3. Specific overlapping session logic (e.g. Workouts, Sleep) - Needs to be before near-equal to catch conflict
  if ((existing.type === "sleep_session" || existing.type === "workout_session") && existing.type === incoming.type) {
    if (existing.endAt && incoming.endAt) {
      if (incoming.startAt < existing.endAt && incoming.endAt > existing.startAt) {
         return {
            type: "mark-conflict",
            existingId: existing.id,
            incomingId: incoming.id,
            reason: "Overlapping sessions detected"
         };
      }
    }
  }

  // 4. Same normalized type, overlapping timestamps and near-equal value
  if (areRecordsNearEqual(existing, incoming)) {
    const existingPriority = getPriority(existing);
    const incomingPriority = getPriority(incoming);

    if (existing.provenance === "manual" && existing.confirmation === "confirmed" && incoming.provenance !== "manual") {
      return {
        type: "keep-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Manual confirmed data is protected from overwrite"
      };
    }

    if (incomingPriority > existingPriority) {
      return {
        type: "replace-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Incoming record has higher provenance priority"
      };
    } else if (incomingPriority < existingPriority) {
      return {
        type: "keep-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Existing record has higher provenance priority"
      };
    } else {
      // Tie breaker based on update time or just keep existing
      const existingUpdate = existing.updatedAt || existing.importedAt;
      const incomingUpdate = incoming.updatedAt || incoming.importedAt;

      if (incomingUpdate > existingUpdate) {
         return {
            type: "replace-existing",
            existingId: existing.id,
            incomingId: incoming.id,
            reason: "Incoming record is newer (priority tie)"
          };
      }

      return {
        type: "keep-existing",
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Existing record kept by default (priority tie)"
      };
    }
  }

  return null; // Not a duplicate
}

export function deduplicateBatch(records: NormalizedRecord[], existingDb: NormalizedRecord[] = []): NormalizedRecord[] {
  const result: NormalizedRecord[] = [...existingDb];

  // Sort incoming deterministically (oldest first, manual overrides)
  const sortedIncoming = [...records].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt - b.startAt;
    return getPriority(b) - getPriority(a); // High priority first for same timestamp
  });

  for (const incoming of sortedIncoming) {
    let resolved = false;

    for (let i = 0; i < result.length; i++) {
      const existing = result[i];
      const resolution = evaluateDuplicate(existing, incoming);

      if (resolution) {
        if (resolution.type === "replace-existing") {
          result[i] = incoming;
          resolved = true;
          break;
        } else if (resolution.type === "keep-existing") {
          resolved = true;
          break;
        } else if (resolution.type === "revoke-existing") {
          result.splice(i, 1);
          resolved = true;
          break;
        } else if (resolution.type === "mark-conflict") {
          // In a real app we might store it flagged, but for now we'll just keep both
          // or handle it differently based on app rules.
          // Keeping both for the sake of not losing data silently.
        }
      }
    }

    if (!resolved) {
      result.push(incoming);
    }
  }

  return result;
}
