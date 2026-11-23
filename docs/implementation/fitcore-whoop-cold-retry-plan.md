# WHOOP cold-start retry implementation plan

Goal: automatically restore eligible WHOOP measurements as promptly as possible after complete PWA restart, preserving authorization, rate limits and retention.

Evidence: deployed Production has only the seven initial WHOOP variables; snapshot caching/background/cleanup are absent. Code therefore provides live-only browser data, and /records generally has no durable snapshot to restore. Existing coordinator starts authenticated records and status concurrently. A cold session that encounters server cooldown receives409 without remaining delay; the client imposes another120s. The new ten-second-remainder coordinator regression fails against main, proving this avoidable delay.

Approach: keep claimSync's null/acquired contract; add an authenticated read of remaining sync_after, active sync lease and refresh lease. Return that server deadline in Retry-After on409. The client honors an explicit future409 retry deadline while retaining prior local deadlines; absent/invalid headers and429 keep current cooldown safeguards. Never persist measurement data or change cache flags.

- [x] Reproduce the ten-second retry failure.
- [ ] Add real Postgres/store and server response regression, including wrong-owner/expired-session isolation.
- [ ] Implement remaining deadline transport and client scheduling; run focused and complete units, TypeScript, production build.
- [ ] Add browser cold-reload scenario with null server records and a short server conflict deadline; retain original expiration and revocation coverage.
- [ ] Focused independent review; commit/push focused PR; merge only after applicable hosted checks and verify production revision.
- [ ] Physical installed-iPhone outcome remains pending user confirmation. Earlier docs claiming physical cold-start success are superseded by the current objective.
