import { randomUUID } from "node:crypto";
import type { WhoopSession } from "./oauth.server";
import type { WhoopSyncActor } from "./postgres.server";
import type { WhoopSnapshot } from "./dashboard";
import { createWhoopArchiveVault, type WhoopArchiveIdentity } from "./archive-vault.server";
import type { WhoopV2Record } from "./v2.server";

type Query = <Row extends Record<string, unknown>>(
  statement: string,
  parameters: (string | number)[],
) => Promise<Row[]>;

export type WhoopArchiveConsent = {
  id: string;
  ownerId: string;
  connectionId: string;
  providerUserId: string;
  grantedAt: string;
  revokedAt: string | null;
  lastSyncedAt: string | null;
  noticeVersion: "owner-measurements-v1";
  purposes: string[];
  source: "settings" | "account-owner-request";
};

const consentColumns = `consent.id, consent.owner_id as "ownerId",
  consent.connection_id as "connectionId", consent.provider_user_id as "providerUserId",
  to_char(consent.granted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "grantedAt",
  to_char(consent.revoked_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "revokedAt",
  to_char(consent.last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
  consent.notice_version as "noticeVersion", consent.purposes, consent.source`;
const authenticatedConnection = `select connection.* from fitcore_whoop.connections connection
  join fitcore_whoop.sessions browser_session on browser_session.owner_id = connection.owner_id
  where browser_session.id = $1 and browser_session.owner_id = $2 and browser_session.expires_at > now()
    and connection.status = 'connected' and connection.provider_user_id is not null`;

function authorizedConnection(actor: WhoopSyncActor) {
  return "id" in actor
    ? authenticatedConnection
    : `select connection.* from fitcore_whoop.connections connection
    where connection.id = $1 and connection.owner_id = $2 and connection.status = 'connected'
      and connection.provider_user_id is not null`;
}
const actorId = (actor: WhoopSyncActor) => ("id" in actor ? actor.id : actor.connectionId);

export function createWhoopArchiveStore(
  query: Query,
  vault: ReturnType<typeof createWhoopArchiveVault>,
) {
  return {
    async getConsent(session: WhoopSyncActor) {
      const [consent] = await query<WhoopArchiveConsent>(
        `with authorized as (${authorizedConnection(session)})
         select ${consentColumns} from fitcore_whoop.archive_consents consent
         join authorized on authorized.id = consent.connection_id
           and authorized.provider_user_id = consent.provider_user_id and authorized.owner_id = consent.owner_id`,
        [actorId(session), session.ownerId],
      );
      return consent ?? null;
    },

    async getInvalidatedAt(session: WhoopSession) {
      const [row] = await query<{ invalidatedAt: string | null }>(
        `with authorized as (${authenticatedConnection}) select
           to_char(archive_invalidated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "invalidatedAt"
         from authorized`,
        [session.id, session.ownerId],
      );
      return row?.invalidatedAt ?? null;
    },

    async eraseRejectedAuthorization(actor: WhoopSyncActor, connectionId: string, syncId: string) {
      await query(
        `with authorized as (${authorizedConnection(actor)} and connection.id = $3
           and connection.sync_id = $4 for update of connection)
         update fitcore_whoop.archive_consents consent set revoked_at = now()
         from authorized where consent.connection_id = authorized.id and consent.owner_id = $2
           and consent.provider_user_id = authorized.provider_user_id and consent.revoked_at is null`,
        [actorId(actor), actor.ownerId, connectionId, syncId],
      );
    },

    // No automatic grant: the caller must have an explicit, authenticated owner instruction.
    async grantConsent(session: WhoopSession, source: WhoopArchiveConsent["source"]) {
      const rows = await query(
        `with authorized as (${authenticatedConnection} for update of connection)
         insert into fitcore_whoop.archive_consents as previous
           (connection_id, id, owner_id, provider_user_id, notice_version, purposes, source)
         select id, $3, owner_id, provider_user_id, 'owner-measurements-v1',
           array['personal-display', 'history', 'fitness-analysis'], $4 from authorized
         on conflict (connection_id) do update set id = excluded.id, owner_id = excluded.owner_id,
           provider_user_id = excluded.provider_user_id, granted_at = now(), revoked_at = null,
           notice_version = excluded.notice_version, purposes = excluded.purposes, source = excluded.source,
           last_synced_at = null
         where previous.revoked_at is not null
         returning id`,
        [session.id, session.ownerId, randomUUID(), source],
      );
      // An unchanged active grant is deliberately idempotent, preserving original time and history.
      return rows.length === 1 || !!(await this.getConsent(session))?.id;
    },

    async revokeConsent(session: WhoopSession) {
      const rows = await query(
        `with authorized as (${authenticatedConnection} for update of connection)
         update fitcore_whoop.archive_consents consent set revoked_at = now()
         from authorized where consent.connection_id = authorized.id and consent.owner_id = $2
           and consent.provider_user_id = authorized.provider_user_id and consent.revoked_at is null returning consent.id`,
        [session.id, session.ownerId],
      );
      return rows.length === 1;
    },

    // The shared provider sync lease and event revision fence make the complete batch atomic.
    // All payloads are normalized and encrypted before any database mutation is attempted.
    async saveSync(
      session: WhoopSyncActor,
      consent: WhoopArchiveConsent,
      syncId: string,
      eventRevision: number,
      records: WhoopV2Record[],
      cooldownSeconds = 120,
    ) {
      if (consent.ownerId !== session.ownerId || consent.revokedAt) return false;
      const batch = new Map<string, Record<string, string | null>>();
      for (const record of records) {
        const identity: WhoopArchiveIdentity = {
          ...consent,
          kind: record.kind,
          recordId: record.id,
          updatedAt: new Date(record.updated_at).toISOString(),
        };
        const envelope = vault.seal(identity, record);
        const previous = batch.get(`${record.kind}:${record.id}`);
        if (previous && Date.parse(previous.updated_at!) > Date.parse(record.updated_at)) continue;
        batch.set(`${record.kind}:${record.id}`, {
          kind: record.kind,
          record_id: record.id,
          updated_at: record.updated_at,
          measured_at: "start" in record ? record.start : record.created_at,
          ended_at: "end" in record ? (record.end ?? null) : null,
          related_sleep_id: "sleep_id" in record ? (record.sleep_id ?? null) : null,
          envelope,
        });
      }
      const [saved] = await query<{ id: string }>(
        `with authorized as (${authorizedConnection(session)} and connection.id = $3
           and connection.sync_id = $4 and connection.event_revision = $5 for update of connection),
         permitted as (
           select consent.* from fitcore_whoop.archive_consents consent join authorized
             on authorized.id = consent.connection_id and authorized.provider_user_id = consent.provider_user_id
           where consent.id = $6 and consent.owner_id = $2 and consent.revoked_at is null for update of consent
         ), upserted as (
           insert into fitcore_whoop.archive_records as previous
             (consent_id, kind, record_id, related_sleep_id, measured_at, ended_at, provider_updated_at, envelope)
           select permitted.id, item.kind, item.record_id, item.related_sleep_id,
             item.measured_at::timestamptz, item.ended_at::timestamptz, item.updated_at::timestamptz, item.envelope
           from permitted cross join jsonb_to_recordset($7::jsonb) as item(
             kind text, record_id text, related_sleep_id text, measured_at text, ended_at text, updated_at text, envelope text)
           where not exists (select 1 from fitcore_whoop.archive_deletions deletion
             where deletion.consent_id = permitted.id and deletion.received_at >= item.updated_at::timestamptz and (
               (deletion.event_type = 'workout.deleted' and item.kind = 'workout' and lower(item.record_id) = deletion.record_id) or
               (deletion.event_type = 'sleep.deleted' and item.kind = 'sleep' and lower(item.record_id) = deletion.record_id) or
               (deletion.event_type in ('sleep.deleted', 'recovery.deleted') and item.kind = 'recovery' and lower(item.related_sleep_id) = deletion.record_id)))
           on conflict (consent_id, kind, record_id) do update set
             related_sleep_id = excluded.related_sleep_id, measured_at = excluded.measured_at,
             ended_at = excluded.ended_at, provider_updated_at = excluded.provider_updated_at,
             envelope = excluded.envelope, synced_at = now()
           where previous.provider_updated_at <= excluded.provider_updated_at
         ), stamped as (
           update fitcore_whoop.archive_consents consent set last_synced_at = now()
           from permitted where consent.id = permitted.id returning consent.connection_id
         )
         update fitcore_whoop.connections connection set last_synced_at = now(),
           sync_id = null, sync_started_at = null, sync_after = now() + $8 * interval '1 second',
           snapshot = null, snapshot_expires_at = null
         from stamped where connection.id = stamped.connection_id returning connection.id`,
        [
          actorId(session),
          session.ownerId,
          consent.connectionId,
          syncId,
          eventRevision,
          consent.id,
          JSON.stringify([...batch.values()]),
          cooldownSeconds,
        ],
      );
      return !!saved;
    },

    async getSnapshot(
      session: WhoopSession,
    ): Promise<(WhoopSnapshot & { version: string }) | null> {
      const [row] = await query<{
        consent: WhoopArchiveConsent;
        lastSyncedAt: string;
        accessExpiresAt: string;
        version: string;
        records: {
          kind: WhoopV2Record["kind"];
          recordId: string;
          updatedAt: string;
          envelope: string;
        }[];
      }>(
        `with authorized as (${authenticatedConnection})
         select jsonb_build_object('ownerId', consent.owner_id, 'connectionId', consent.connection_id,
             'providerUserId', consent.provider_user_id) as consent,
           to_char(consent.last_synced_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "lastSyncedAt",
           to_char(browser_session.expires_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "accessExpiresAt",
           authorized.id::text || ':' || authorized.event_revision::text as version,
           (select coalesce(jsonb_agg(jsonb_build_object('kind', kind, 'recordId', record_id,
             'updatedAt', to_char(provider_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
             'envelope', envelope) order by measured_at, kind, record_id), '[]'::jsonb)
            from fitcore_whoop.archive_records where consent_id = consent.id) as records
         from authorized join fitcore_whoop.archive_consents consent on consent.connection_id = authorized.id
           and consent.owner_id = authorized.owner_id and consent.provider_user_id = authorized.provider_user_id
         join fitcore_whoop.sessions browser_session on browser_session.id = $1
         where consent.revoked_at is null and consent.last_synced_at is not null`,
        [session.id, session.ownerId],
      );
      if (!row) return null;
      // Authentication failure of any row rejects the whole snapshot; never silently fabricate partial history.
      const records = row.records.map((record) =>
        vault.open({ ...row.consent, ...record }, record.envelope),
      );
      return {
        lastSyncedAt: row.lastSyncedAt,
        accessExpiresAt: row.accessExpiresAt,
        version: row.version,
        records,
      };
    },
  };
}
