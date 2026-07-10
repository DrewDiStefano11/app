import { NormalizedRecord, DeduplicationResolution, DeduplicationResult, WearableConflict, DuplicateEvaluation, SleepSessionPayload, WorkoutSessionPayload } from "./types";

interface SessionRange {
  startMs: number;
  endMs: number;
}

function getSessionRange(record: NormalizedRecord): SessionRange | null {
  if (record.type !== "sleep_session" && record.type !== "workout_session") return null;

  let startMs = record.startAt;
  let endMs = record.endAt;

  if (record.payload) {
    if (record.type === "workout_session") {
       const p = record.payload as WorkoutSessionPayload;
       // If end is missing but we have duration, derive it
       if (!endMs && p.duration && p.duration > 0) {
         endMs = startMs + p.duration;
       }
    }
    // SleepSessionPayload doesn't cleanly define overall end bounds without inferring from stages if missing,
    // but standard normalization ensures endAt is set if available.
  }

  if (typeof startMs === 'number' && typeof endMs === 'number' && Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
    return { startMs, endMs };
  }

  return null;
}

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

  // Data completeness tie-breaker
  if (record.value !== undefined) score += 1;
  if (record.payload !== undefined) score += 1;

  return score;
}

function areRecordsNearEqual(a: NormalizedRecord, b: NormalizedRecord): boolean {
  if (a.type !== b.type) return false;
  if (a.canonicalUnit !== b.canonicalUnit) return false;

  const rangeA = getSessionRange(a);
  const rangeB = getSessionRange(b);

  if (rangeA && rangeB) {
    // For near-equal session matching (e.g. same workout from 2 sources), the start and end should be close (within 10 minutes for long sessions)
    if (Math.abs(rangeA.startMs - rangeB.startMs) > 600000 || Math.abs(rangeA.endMs - rangeB.endMs) > 600000) return false;
  } else if (!rangeA && !rangeB) {
    if (Math.abs(a.startAt - b.startAt) > 60000) return false;
  } else {
    return false; // One is range, one is scalar
  }

  // Value equivalence (allow small drift)
  if (a.value !== undefined && b.value !== undefined) {
    const diff = Math.abs(a.value - b.value);
    const maxDiff = Math.max(a.value, b.value) * 0.05; // 5% tolerance
    if (diff > maxDiff && diff > 1) return false;
  } else if (a.value !== undefined || b.value !== undefined) {
    // If one has value and the other doesn't, but they are same type and same time,
    // they are near equal in terms of duplicate candidates, but one is more complete.
    // Allow them to be considered near equal so completeness tie-breaker can handle it.
  }

  return true;
}

export function evaluateDuplicate(
  existing: NormalizedRecord,
  incoming: NormalizedRecord
): DeduplicationResolution | WearableConflict | null {
  // 1. Same Provider ID
  if (
    existing.provider === incoming.provider &&
    existing.providerRecordId &&
    existing.providerRecordId === incoming.providerRecordId
  ) {
    if (incoming.revoked) {
      return {
        kind: "duplicate",
        type: "revoke-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [existing.id],
        reason: "Incoming record marks existing provider record as revoked"
      };
    }

    const existingUpdate = existing.updatedAt || existing.importedAt;
    const incomingUpdate = incoming.updatedAt || incoming.importedAt;

    if (incomingUpdate > existingUpdate) {
      return {
        kind: "duplicate",
        type: "replace-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [existing.id],
        reason: "Incoming record is a newer version from the same provider"
      };
    } else {
      return {
        kind: "duplicate",
        type: "keep-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [incoming.id],
        reason: "Existing record is newer or same version from the same provider"
      };
    }
  }

  // 2. Cross-Provider Linkage
  if (incoming.metadata?.linkedProviderRecordId === existing.id || existing.metadata?.linkedProviderRecordId === incoming.id) {
     return {
        kind: "duplicate",
        type: "replace-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [existing.id],
        reason: "Explicit cross-provider linkage replace"
     };
  }

  // 3. Same normalized type, overlapping timestamps and near-equal value
  if (areRecordsNearEqual(existing, incoming)) {
    const existingPriority = getPriority(existing);
    const incomingPriority = getPriority(incoming);

    if (existing.provenance === "manual" && existing.confirmation === "confirmed" && incoming.provenance !== "manual") {
      return {
        kind: "duplicate",
        type: "keep-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [incoming.id],
        reason: "Manual confirmed data is protected from overwrite",
        manualProtectionApplied: true
      };
    }

    if (incomingPriority > existingPriority) {
      return {
        kind: "duplicate",
        type: "replace-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [existing.id],
        reason: "Incoming record has higher provenance priority",
        directProviderPreferenceApplied: incoming.provenance === "direct" && existing.provenance === "aggregator"
      };
    } else if (incomingPriority < existingPriority) {
      return {
        kind: "duplicate",
        type: "keep-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        droppedRecordIds: [incoming.id],
        reason: "Existing record has higher provenance priority",
        directProviderPreferenceApplied: existing.provenance === "direct" && incoming.provenance === "aggregator"
      };
    } else {
      // Tie breaker based on update time or just keep existing
      const existingUpdate = existing.updatedAt || existing.importedAt;
      const incomingUpdate = incoming.updatedAt || incoming.importedAt;

      if (incomingUpdate > existingUpdate) {
         return {
            kind: "duplicate",
            type: "replace-existing",
            recordType: existing.type,
            existingId: existing.id,
            incomingId: incoming.id,
            droppedRecordIds: [existing.id],
            reason: "Incoming record is newer (priority tie)"
          };
      } else if (existingUpdate > incomingUpdate) {
        return {
          kind: "duplicate",
          type: "keep-existing",
          recordType: existing.type,
          existingId: existing.id,
          incomingId: incoming.id,
          droppedRecordIds: [incoming.id],
          reason: "Existing record is newer (priority tie)"
        };
      }

      // Final deterministic tie-breaker based on ID
      if (incoming.id > existing.id) {
          return {
            kind: "duplicate",
            type: "replace-existing",
            recordType: existing.type,
            existingId: existing.id,
            incomingId: incoming.id,
            droppedRecordIds: [existing.id],
            reason: "Final deterministic tie-breaker (ID)"
          };
      } else if (existing.id > incoming.id) {
          return {
            kind: "duplicate",
            type: "keep-existing",
            recordType: existing.type,
            existingId: existing.id,
            incomingId: incoming.id,
            droppedRecordIds: [incoming.id],
            reason: "Final deterministic tie-breaker (ID)"
          };
      }

      return {
        kind: "duplicate",
        type: "keep-existing",
        recordType: existing.type,
        existingId: existing.id,
        incomingId: incoming.id,
        reason: "Exact duplicate ID, keeping existing"
      };
    }
  }

  // 4. Specific overlapping session logic (e.g. Workouts, Sleep)
  if (existing.type === incoming.type && (existing.type === "sleep_session" || existing.type === "workout_session")) {
    const rangeE = getSessionRange(existing);
    const rangeI = getSessionRange(incoming);

    if (rangeE && rangeI) {
      const overlapStart = Math.max(rangeE.startMs, rangeI.startMs);
      const overlapEnd = Math.min(rangeE.endMs, rangeI.endMs);
      const overlapMs = Math.max(0, overlapEnd - overlapStart);

      if (overlapMs > 0) {
         return {
            kind: "conflict",
            involvedIds: [existing.id, incoming.id],
            recordType: existing.type,
            conflictType: "overlapping_session",
            overlapMs,
            reason: "Overlapping sessions detected",
            recommendedAction: "keep_both"
         };
      }
    }
  }

  // 5. Overlapping timestamps but materially different values (for scalars)
  if (existing.type === incoming.type && existing.type !== "sleep_session" && existing.type !== "workout_session") {
     if (existing.endAt && incoming.endAt) {
       if (incoming.startAt < existing.endAt && incoming.endAt > existing.startAt) {
          return {
            kind: "conflict",
            involvedIds: [existing.id, incoming.id],
            recordType: existing.type,
            conflictType: "material_difference",
            overlapMs: Math.max(0, Math.min(existing.endAt, incoming.endAt) - Math.max(existing.startAt, incoming.startAt)),
            reason: "Materially different values for overlapping timeframe",
            recommendedAction: "keep_both"
          };
       }
     } else {
       if (Math.abs(existing.startAt - incoming.startAt) <= 60000) {
          return {
            kind: "conflict",
            involvedIds: [existing.id, incoming.id],
            recordType: existing.type,
            conflictType: "material_difference",
            overlapMs: 0,
            reason: "Materially different values at same point in time",
            recommendedAction: "keep_both"
          };
       }
     }
  }

  return null; // Not a duplicate
}

export function deduplicateBatch(records: NormalizedRecord[], existingDb: NormalizedRecord[] = []): DeduplicationResult {
  const result: NormalizedRecord[] = [...existingDb];
  const resolutions: DeduplicationResolution[] = [];
  const conflicts: WearableConflict[] = [];

  // Sort incoming deterministically (oldest first, manual overrides)
  const sortedIncoming = [...records].sort((a, b) => {
    if (a.startAt !== b.startAt) return a.startAt - b.startAt;
    const prioDiff = getPriority(b) - getPriority(a);
    if (prioDiff !== 0) return prioDiff;
    return a.id.localeCompare(b.id);
  });

  for (const incoming of sortedIncoming) {
    let resolved = false;

    // Check if the record is exactly identical in ID (idempotency check)
    if (result.some(r => r.id === incoming.id)) {
      continue;
    }

    for (let i = 0; i < result.length; i++) {
      const existing = result[i];
      const resolution = evaluateDuplicate(existing, incoming);

      if (resolution) {
        if (resolution.kind === 'conflict') {
           conflicts.push(resolution);
           // Continuing to push to result to avoid data loss unless resolved
           result.push(incoming);
           resolved = true;
           break;
        }

        if (resolution.kind === 'duplicate') {
           resolutions.push(resolution);

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
           }
        }
      }
    }

    if (!resolved) {
      result.push(incoming);
    }
  }

  return { records: result, resolutions, conflicts };
}
