# Development dependency advisory #36

The confirmed [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)
affects minimatch >=7 and <11.0.1. Main resolved development-only minimatch 10.2.5
through TypeScript-ESTree 8.62.0. No application runtime path was identified.

A scoped npm override changes only TypeScript-ESTree's minimatch to the patched
11.x line (lockfile: 11.0.9). ESLint's independent minimatch 3.1.5 is preserved.
The new transitive matcher is a maintainer dependency of minimatch, not a new
application feature. Minimatch 11 requires Node 20 or >=22; current local and CI
validation use Node 24. Existing Node 18 tooling would need upgrading.

Compatibility was checked through the public TypeScript parser's actual project
service: an allowed dotfile glob produced a typed program, while a nonmatching
file was rejected. TypeScript-ESTree uses the preserved named `minimatch()` API;
it does not use the removed AST/makeRe exports. TypeScript and the Vercel build
pass. Scoped ESLint output exactly matches the prior Windows checkout's existing
87 CRLF formatting findings; this change adds no lint findings. `npm audit`
reports zero vulnerabilities after the lockfile update.

No WHOOP configuration, application data or production deployment was changed.
Merge requires separate approval and hosted validation.
