-- Resumable full-history import; no flags, consent or measurements are created.
begin;
-- NULL means an unbounded provider query, rather than an invented lower date.
alter table fitcore_whoop.archive_imports alter column window_start drop not null;
alter table fitcore_whoop.archive_imports add column pages integer not null default 0;
alter table fitcore_whoop.archive_imports add column records_seen integer not null default 0;
alter table fitcore_whoop.archive_imports add column seen_tokens text[] not null default '{}';
commit;
