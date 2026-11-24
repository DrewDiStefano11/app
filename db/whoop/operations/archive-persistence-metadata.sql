-- After migrations 006/007 only. Read-only aggregate evidence, never payloads or IDs.
begin read only;
select count(*) filter (where revoked_at is null) as active_consents,
  count(*) filter (where revoked_at is not null) as withdrawn_consents,
  max(last_synced_at) as last_archive_sync_at
from fitcore_whoop.archive_consents;
select kind, count(*) as encrypted_record_count,
  bool_and(envelope like 'v1.%') as all_versioned_envelopes,
  min(measured_at) as earliest_record_at, max(measured_at) as latest_record_at,
  max(synced_at) as last_written_at
from fitcore_whoop.archive_records group by kind order by kind;
select count(*) as duplicate_groups from (
  select consent_id, kind, record_id from fitcore_whoop.archive_records
  group by consent_id, kind, record_id having count(*) > 1
) duplicates;
select status, count(*) as connection_count, max(last_synced_at) as last_provider_sync_at
from fitcore_whoop.connections group by status;
commit;
