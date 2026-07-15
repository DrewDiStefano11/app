# FitCore Jarvis Model Asset Lifecycle and Distribution

## 2. Document status

- this is a proposed architecture and lifecycle specification;
- no model assets are downloaded or added by this PR;
- exact model filenames and revisions depend on later approved selections;
- the common lifecycle must support both the iPhone 15 and iPhone 16;
- all size, performance, and storage estimates require verification;
- model sources, licenses, and hashes must eventually be pinned.

## 3. Executive recommendation

- post-install model download rather than bundling all large assets;
- native ownership of large model files;
- signed or integrity-checked manifest;
- pinned source revision;
- resumable download;
- atomic installation;
- model registry;
- on-demand loading;
- unload-after-idle behavior;
- user-visible storage controls;
- rollback;
- system TTS or text-only fallback if optional assets are absent.

## 4. Goals and constraints

### Goals

- reliable installation;
- offline operation after installation;
- transparent download size;
- user control;
- integrity;
- reproducibility;
- license compliance;
- safe updates;
- safe rollback;
- controlled storage;
- controlled memory;
- controlled battery and thermal behavior;
- consistent behavior across supported phones;
- no mandatory recurring service.

### Constraints

- multi-gigabyte possible total size;
- variable available storage;
- mobile data limits;
- interrupted downloads;
- app suspension;
- model format changes;
- runtime compatibility;
- Apple backup behavior;
- App Store bundle-size considerations;
- asset-source availability;
- model license restrictions;
- memory pressure;
- thermal pressure;
- differences between installed and loaded size.

## 5. Expected asset categories

_Exact files remain dependent on final component selection._

### Speech-recognition assets

- model weights;
- tokenizer;
- vocabulary;
- normalization resources;
- end-of-utterance model;
- configuration.

### Agent-model assets

- quantized model;
- tokenizer metadata;
- chat template;
- grammar or structured-output resources;
- configuration;
- license.

### Speech-generation assets

- TTS model;
- tokenizer;
- vocoder;
- voice embeddings;
- voice metadata;
- license and attribution.

### Runtime metadata

- model manifest;
- compatibility metadata;
- checksum;
- version;
- required runtime version;
- minimum device requirements;
- attribution.

## 6. Bundle versus post-install download comparison

| Strategy                               | Initial app size | First-use experience | Offline readiness | Update flexibility | App Store risk | User control | Recommendation |
| -------------------------------------- | ---------------- | -------------------- | ----------------- | ------------------ | -------------- | ------------ | -------------- |
| Bundle all assets                      | Massive          | Immediate            | Full              | Low                | High           | None         | Reject         |
| Bundle minimum command assets only     | Moderate         | Fast                 | Partial           | Medium             | Low            | Low          | Reject         |
| Download all assets after installation | Small            | Delayed              | None              | High               | Low            | High         | **Recommend**  |
| Staged core and enhanced packs         | Small            | Delayed              | Scaled            | High               | Low            | High         | Consider       |
| App Store on-demand resources          | Small            | Variable             | Partial           | Low                | Low            | Low          | Reject         |
| Remote streaming without local storage | Small            | Immediate            | None              | High               | Low            | Low          | Reject         |
| User-selectable model packs            | Small            | Delayed              | Custom            | High               | Low            | High         | Consider       |

**Primary Recommendation**: Download all assets after installation.

## 7. Recommended asset-pack strategy

First version should avoid optional packs until the baseline is proven.

### Core application

- FitCore application;
- deterministic command engine;
- Apple system-speech fallback;
- model manager;
- download UI;
- license notices;
- no large optional model bundle.

### Core Jarvis pack

- speech recognition;
- local agent conversation;
- enhanced speech output if included in baseline.

### Optional enhanced pack

- higher-quality TTS voice;
- larger model;
- optional iPhone 16 enhancement.

## 8. Asset manifest architecture

```text
manifestVersion
assetPackId
displayName
description
releaseVersion
modelRevision
runtimeCompatibility
minimumOS
minimumDeviceClass
files
downloadSize
installedSize
checksumAlgorithm
checksums
licenseIdentifiers
attributionFiles
sourceURLs
fallbackPack
revoked
releasedAt
```

- **manifestVersion**: Required. Schema version of the manifest. Trust source: Application bundle or signed remote manifest. Update behavior: Static per release.
- **assetPackId**: Required. Unique identifier. Trust source: Application bundle. Update behavior: Static.
- **displayName**: Required. User-visible name. Trust source: Application bundle. Update behavior: Minor updates allowed.
- **description**: Required. User-visible description. Trust source: Application bundle. Update behavior: Minor updates allowed.
- **releaseVersion**: Required. Version of the pack. Trust source: Remote manifest. Update behavior: Increments on new release.
- **modelRevision**: Required. Exact git commit or stable hash of the model. Trust source: Remote manifest. Update behavior: Updates when model changes.
- **runtimeCompatibility**: Required. Engine version needed to run the pack. Trust source: Remote manifest. Update behavior: Updates when minimum engine version changes.
- **minimumOS**: Required. Minimum iOS version required. Trust source: Remote manifest. Update behavior: Updates on OS requirement change.
- **minimumDeviceClass**: Required. e.g., iPhone 15. Trust source: Remote manifest. Update behavior: Static.
- **files**: Required. Array of file metadata. Trust source: Remote manifest. Update behavior: Updates when files change.
- **downloadSize**: Required. Total bytes to download. Trust source: Remote manifest. Update behavior: Updates when files change.
- **installedSize**: Required. Total bytes on disk after extraction/installation. Trust source: Remote manifest. Update behavior: Updates when files change.
- **checksumAlgorithm**: Required. Algorithm used for hashes (e.g., SHA-256). Trust source: Application bundle. Update behavior: Rarely changes.
- **checksums**: Required. Root checksum or checksum for the manifest itself. Trust source: Remote manifest. Update behavior: Updates on release.
- **licenseIdentifiers**: Required. SPDX identifiers or custom strings. Trust source: Remote manifest. Update behavior: Updates on license change.
- **attributionFiles**: Required. Links or paths to attribution text. Trust source: Remote manifest. Update behavior: Updates on license change.
- **sourceURLs**: Required. URLs to download the pack. Trust source: Remote manifest. Update behavior: Updates on source change.
- **fallbackPack**: Optional. Pack ID to use if this one fails. Trust source: Remote manifest. Update behavior: Updates on fallback change.
- **revoked**: Required. Boolean. Trust source: Remote manifest. Update behavior: Set to true if compromised.
- **releasedAt**: Required. Timestamp. Trust source: Remote manifest. Update behavior: Updates on new release.

## 9. File-entry metadata

```text
fileId
relativePath
downloadURL
expectedBytes
checksum
contentType
role
required
compression
decompressedBytes
licenseReference
```

Requirements:

- no arbitrary absolute paths;
- path traversal protection;
- no dynamic executable code;
- expected file size;
- checksum;
- role;
- required versus optional status.

## 10. Model-source policy

1. Official model publisher.
2. Official project repository.
3. Verified release mirror controlled by FitCore.
4. Other source only after separate review.

Requirements:

- HTTPS;
- pinned revision;
- exact filename;
- exact checksum;
- retained license;
- retained model card or source metadata;
- no floating `main`;
- no arbitrary user-supplied URL;
- no silent redirect to an untrusted domain;
- no peer-to-peer model download in the baseline.

## 11. Download flow

```text
User chooses to install Jarvis
    ↓
Application retrieves trusted manifest
    ↓
Compatibility check
    ↓
Available-storage check
    ↓
User sees download and installed-size estimate
    ↓
User approves download
    ↓
Temporary file download begins
    ↓
Progress and status displayed
    ↓
Download completes
    ↓
Size and checksum verified
    ↓
Files moved atomically into final location
    ↓
Pack registered
    ↓
Health check runs
    ↓
Pack becomes available
```

Failure behavior:

- If manifest retrieval fails, installation stops, show error.
- If compatibility check fails, stop, show user unsupported OS/Device message.
- If storage check fails, stop, prompt user to free space.
- If download is interrupted, pause and attempt resume using temporary file.
- If download fully fails, stop, show retry option.
- If size/checksum verification fails, delete temporary file, stop, show corruption error.
- If atomic move fails, stop, rollback temporary file, show file system error.
- If registration fails, stop, revert move.
- If health check fails, stop, mark pack as failed, potentially initiate rollback.

## 12. Download consent and user experience requirements

Setup experience must display:

- pack purpose;
- download size;
- expected installed size;
- required free-space buffer;
- network requirement;
- approximate number of assets;
- offline benefit;
- license and attribution link;
- whether Wi-Fi is recommended;
- ability to cancel;
- ability to resume;
- ability to delete later.

## 13. Network-policy behavior

- Wi-Fi: Default and recommended.
- cellular data: Require explicit user approval for large packs. No silent multi-gigabyte cellular download.
- Low Data Mode: Pause or severely restrict download.
- roaming: Pause download, warn user.
- background download: Supported via URLSession.
- paused download: Maintain state, show visible pause status.
- user preference: Allow toggling cellular download permission.
- retry: No endless retry loop; download timeout and backoff; safe cancellation.

## 14. Resumable-download behavior

- temporary file: Save partially downloaded data here.
- resumable task: Use `URLSessionDownloadTask` resume data.
- resume metadata: Track ETag, byte range, Last-Modified.
- partial-file validation: Never register partial files as valid.
- restart conditions: Only if file hasn't changed on server, and resume data is valid.
- expired resume data: Clean old partial files after bounded retention.
- source revision changes: If source changes, incompatible revision restarts safely from 0.
- app termination: `URLSession` background task continues or pauses safely.
- device restart: Resume paused downloads on launch if possible.
- canceled download: Delete temporary files immediately.
- user retry: Try to use existing resume data.
- Progress is not falsely reported as complete.

## 15. Available-storage checks

- download size: Check if compressed bundle fits.
- decompressed size: Check if final extracted files fit.
- temporary duplicate space: Check if (download size + decompressed size) fits during extraction.
- required free-space safety buffer: Maintain OS breathing room (e.g., 2-5GB).
- database and application needs: Ensure FitCore core functions aren't starved.
- operating-system reserve: Account for iOS storage reporting inaccuracies.

Requirements:

- preflight check;
- in-download recheck where practical;
- clear insufficient-storage message;
- no deletion of unrelated user data;
- link or navigation to model-management settings;
- no assumption that reported free storage remains constant.

## 16. Storage-location decision

Candidates:

- application bundle: Read-only, updated via App Store. Not suitable for post-install.
- Application Support: Persistent, hidden from user. Backed up by default.
- Caches: Can be purged by OS when space is low. Not suitable for offline reliability.
- Documents: Visible to user in Files app. Not appropriate for models.
- temporary directory: Purged often.

**Primary Recommendation**: Use `Application Support` directory. Models should not be purged by the OS (unlike Caches) as they are critical for offline functionality, nor should they appear in the Files app (unlike Documents).

## 17. Backup policy

- model weights: Should be explicitly excluded from backup (`NSURLIsExcludedFromBackupKey`) as they are re-downloadable and large.
- manifests: Kept in backup (small).
- licenses and attribution: Kept in backup (small).
- user-downloaded voice packs: Excluded from backup if large and re-downloadable.
- conversation memory: Kept in backup (separate from models).

## 18. File-protection requirements

- appropriate iOS file-protection class: `NSFileProtectionCompleteUntilFirstUserAuthentication` is recommended for general assets, ensuring they are accessible when the app runs but protected otherwise.
- model files versus user data: Model files don't need highest protection like user health data, but tampering could create a security risk.
- provider credentials excluded from model storage.
- temporary files protected.
- integrity metadata protected.
- no world-readable or shared container unless explicitly required.

## 19. Integrity-verification flow

```text
Downloaded temporary file
    ↓
Expected byte length checked
    ↓
Cryptographic checksum calculated
    ↓
Checksum compared with trusted manifest
    ↓
License and metadata presence checked
    ↓
File-format sanity check
    ↓
Atomic install
```

Requirements:

- SHA-256 or stronger approved algorithm;
- checksum calculated before registration;
- failure closed;
- corrupted file deleted or quarantined;
- no model loading before verification;
- verification repeated after migration or suspicious failure where appropriate.

## 20. Manifest trust and authenticity

Candidates:

- bundled trusted manifest
- remotely fetched signed manifest
- application-release-pinned manifest
- unsigned remote manifest

**Recommendation**: Application-release-pinned manifest bundled in the app, or a remotely fetched signed manifest from a trusted FitCore server. A bundled manifest is safest for initial versions to pin exact known-good models.

Requirements:

- manifest cannot silently reduce security controls;
- remote manifest changes are validated;
- revoked model flags supported;
- source-domain allowlist;
- version rollback protection where appropriate;
- clear separation between application update and model update.

## 21. Atomic installation

- download to temporary location;
- verify;
- create staged install;
- atomic directory or file replacement (e.g., using `NSFileManager.replaceItemAtURL`);
- registration transaction;
- cleanup;
- rollback after failure.

Requirements:

- current working model remains available until replacement passes health checks;
- failed update does not remove the previous valid version;
- app crash during install does not leave a pack falsely active.

## 22. Model registry

Local registry containing:

- installed pack ID;
- installed version;
- model revision;
- file paths;
- checksums;
- install date;
- last verification date;
- compatibility;
- health status;
- active or inactive;
- rollback version;
- license references;
- user-selected voice or variant.

Requirements:

- registry is not the source of truth without file verification;
- registry updates transactionally;
- missing files detected;
- stale records repaired;
- no raw arbitrary paths exposed to the language model.

## 23. Compatibility matrix

- application version;
- bridge protocol version;
- runtime version;
- model format;
- tokenizer version;
- operating system;
- device class;
- available memory;
- optional hardware capability.

Requirements:

- incompatible assets remain unavailable;
- clear status;
- fallback;
- no attempt to load known-incompatible files;
- migration only when explicitly supported.

## 24. Model-health checks

- files present;
- checksums valid;
- runtime can open model;
- tokenizer loads;
- minimal inference succeeds;
- structured-output capability works where required;
- TTS can produce a short sample;
- STT can initialize;
- memory remains within provisional limits.

Requirements:

- health check uses synthetic non-user data;
- failure does not expose sensitive records;
- current valid version remains available.

## 25. Model-loading states

```text
Not installed
Downloading
Paused
Verifying
Installing
Installed
Loading
Ready
In use
Unloading
Unavailable
Failed
Revoked
Deleting
```

- Not installed: Allowed to transition to Downloading. User sees prompt.
- Downloading: Transitions to Paused, Verifying, Failed. User sees progress.
- Ready: Jarvis can operate.
- Unloading: Transitions to Installed.

## 26. Runtime load and unload policy

### Cold state

Assets installed but model not in memory.

### Preloading

Triggered by:

- opening Jarvis;
- opening active workout;
- explicit user preference;
- expected immediate use.

### Ready

Model loaded and health-checked.

### Active

Current inference or speech task.

### Warm idle

Remain loaded briefly after recent use.

### Unload

Triggered by:

- inactivity;
- memory pressure;
- thermal pressure;
- app backgrounding;
- low-power mode;
- user setting;
- provider switch.

```text
[ Installed ] --> (preload) --> [ Loading ] --> [ Ready ]
                                                   |
[ Unloading ] <--- (idle) ----- [ Warm idle ] <--- (task ends)
    |
[ Installed ]
```

## 27. Preload strategy

**Recommendation**: Preload when Jarvis opens or active workout starts.
Avoid loading every large model at general app launch to save battery, memory, and app-launch time for normal FitCore users who may not use Jarvis.

## 28. Coordinated multi-model loading

- simultaneous residency vs staggered loading;
- resource ownership;
- fallback;
- release order;
- iPhone 15 constraints;
- speech and model concurrency.

Requirements:

- no assumption that every model can remain loaded indefinitely;
- resource manager tracks memory warnings;
- one heavy LLM session at a time;
- optional assets unloaded before required assets;
- Apple system TTS available as fallback.

## 29. Memory-pressure behavior

Response hierarchy:

1. Stop optional background work.
2. Reduce context and generation size.
3. Unload optional enhanced model.
4. Unload enhanced TTS and use system voice.
5. Unload inactive model.
6. Preserve active workout data.
7. Enter deterministic-command or text-only degraded mode.
8. Report clear status.

```text
[ Memory Warning ]
    ↓
Stop optional work
    ↓
Unload enhanced models
    ↓
Unload inactive models
    ↓
Degraded mode (text-only)
```

Requirements:

- no data corruption;
- no repeated crash loop;
- no silent action replay;
- no model reload storm.

## 30. Thermal-pressure behavior

Response hierarchy:

- shorten responses;
- disable optional reasoning;
- reduce model concurrency;
- pause preload;
- use system TTS;
- unload enhanced assets;
- stop background synthesis;
- enter deterministic mode;
- notify the user only when useful.

```text
[ Thermal Warning ]
    ↓
Reduce concurrency & pauses preloads
    ↓
Disable enhanced features
    ↓
Enter deterministic mode
```

Require final thresholds to come from physical-device testing.

## 31. Low-power behavior

Low Power Mode should:

- delay preload;
- shorten warm-idle duration;
- reduce output length;
- use system TTS;
- disable optional enhanced model;
- preserve essential commands.

## 32. Application lifecycle behavior

- cold app launch;
- foregrounding;
- active workout;
- temporary backgrounding;
- screen lock;
- phone call;
- app termination;
- device restart;
- application update.

Requirements:

- loaded models can be released safely;
- downloads recover;
- no stale inference resumes automatically;
- previous valid installed assets remain registered;
- active workout data remains separate and safe.

## 33. Model update policy

### Security update

- urgent;
- may revoke old version;
- clear notice;
- fallback if update cannot install.

### Compatibility update

- required for new runtime or OS;
- old version retained until successful replacement.

### Quality update

- optional or staged;
- user informed if large;
- rollback available.

### License or notice update

- metadata may update without model replacement where appropriate.

Requirements:

- no silent incompatible update;
- release notes;
- exact size;
- version pinning;
- update timing;
- user choice where practical.

## 34. Automatic versus manual updates

**Recommendation**: Manual update for the first version. A conservative first version should require explicit approval for large model updates.

## 35. Rollback strategy

```text
New model downloaded
    ↓
Verified
    ↓
Installed alongside current version
    ↓
Health check
    ↓
Activated
    ↓
Previous version retained temporarily
```

Require rollback when:

- health check fails;
- repeated runtime crash occurs;
- compatibility issue found;
- security revocation applies to new version;
- user reports severe regression where supported.

## 36. Revocation strategy

- manifest revocation flag;
- model disabled;
- user informed;
- safe fallback;
- deletion option;
- no loading after revocation;
- emergency application update where necessary.

## 37. Model deletion

User controls to:

- remove one optional pack;
- remove enhanced voice;
- remove all Jarvis models;
- reinstall;
- view reclaimed storage.

```text
User Requests Deletion
    ↓
Ensure model is not active
    ↓
Unload model
    ↓
Remove from registry
    ↓
Delete files from storage
    ↓
Display reclaimed space
```

Requirements:

- explicit preview;
- no deletion of FitCore user data;
- no deletion during active inference;
- transactional registry update;
- incomplete deletion recovery;
- Jarvis falls back safely;
- licenses or required notices retained if necessary for past distribution records only where appropriate.

## 38. Reset and repair

```text
User Requests Repair
    ↓
Reverify installed files
    ↓
Redownload missing/corrupted files
    ↓
Rebuild registry state
```

Repair operations:

- reverify;
- redownload missing file;
- rebuild registry;
- remove stale temporary files;
- reinstall pack;
- return to system voice;
- reset selected model variant.

Require repair not to delete conversations, memories, workouts, or other FitCore data.

## 39. Partial availability

```text
[ Model Failure ] --> Is STT available? --> No: Text-only mode
    ↓ Yes
Is LLM available? --> No: Deterministic commands
    ↓ Yes
Is TTS available? --> No: Text response / System TTS
```

### STT available, LLM unavailable

- deterministic commands;
- text transcript;
- prewritten responses;
- conversational coaching unavailable.

### LLM available, STT unavailable

- text conversation;
- no voice input.

### TTS unavailable

- text response;
- Apple system TTS fallback where available.

### Only deterministic engine available

- set logging;
- timers;
- navigation;
- Undo;
- clear degraded-mode status.

### Optional enhancement unavailable

- common baseline continues.

## 40. Offline behavior

- installed assets work offline;
- manifest cache;
- model status remains available;
- no update check required to use installed valid model;
- expired network token must not block local use;
- no mandatory online license check unless a model license explicitly requires it and the model is therefore reconsidered.

## 41. License and attribution packaging

Require retaining:

- model license;
- runtime license;
- attribution;
- source link;
- revision;
- modification disclosure;
- voice attribution where required;
- third-party notices.

Requirements:

- notices available inside the app;
- notices associated with installed version;
- no asset distributed without reviewed license;
- license changes treated as release events.

## 42. Distribution-rights decision process

Require review of:

- commercial use;
- redistribution;
- derivative or quantized weights;
- attribution;
- acceptable-use restrictions;
- trademark or naming restrictions;
- dataset-related obligations where relevant;
- model-card requirements.

Technical availability does not automatically mean redistribution is permitted.

## 43. Hosting strategy

Options:

- download directly from official model host;
- FitCore-controlled release hosting;
- GitHub Releases;
- Hugging Face;
- object storage;
- content-delivery network.

**Recommendation**: Use Hugging Face for feasibility testing. Use FitCore-controlled object storage/CDN for production distribution to ensure reliability, cost control, and exact revision pinning.

## 44. Free-cost considerations

Distinguish:

- local inference cost;
- model-hosting bandwidth;
- App Store distribution cost;
- developer-program cost;
- optional third-party hosting;
- direct official-host downloads;
- possible free-tier limits.

Recommend a path that minimizes recurring bandwidth cost while remaining reliable and license-compliant, such as caching popular models effectively.

## 45. User settings

Future settings:

- installed packs;
- active pack;
- download over cellular;
- automatic update preference;
- storage used;
- delete models;
- verify models;
- system-voice fallback;
- preload preference;
- battery-saving mode;
- enhanced-pack toggle.

## 46. User-visible status

- Jarvis ready;
- download required;
- downloading;
- paused;
- verifying;
- installing;
- loading;
- unavailable;
- storage required;
- update available;
- repair required;
- degraded mode;
- model revoked.

## 47. Diagnostics

Safe diagnostics:

- pack ID;
- version;
- revision;
- installed size;
- health status;
- checksum result;
- last load result;
- runtime compatibility;
- failure code;
- load duration category;
- memory-pressure count;
- thermal-pressure count.

Do not log: model prompts; transcripts; health data; provider secrets; full user file paths where unnecessary.

## 48. Failure and recovery matrix

| Failure                 | Detection               | User-visible behavior | Automatic recovery    | Manual recovery  | Safety rule                  |
| ----------------------- | ----------------------- | --------------------- | --------------------- | ---------------- | ---------------------------- |
| Manifest unavailable    | Network fetch fails     | "Download required"   | Retry on next attempt | Tap to retry     | Fail closed                  |
| Manifest invalid        | Parse error             | "Update unavailable"  | Fetch again later     | None             | Reject manifest              |
| Download interrupted    | `URLSession` error      | "Paused"              | Background resume     | Tap to resume    | Do not register partial file |
| Insufficient storage    | Preflight / in-progress | "Storage required"    | None                  | User frees space | Preserve app function        |
| Unexpected file size    | Size mismatch           | "Corruption detected" | Delete and retry      | Reinstall        | Never load unverified        |
| Checksum mismatch       | Verification phase      | "Corruption detected" | Delete and retry      | Reinstall        | Never load unverified        |
| License file missing    | Post-download check     | "Installation failed" | Retry download        | Reinstall        | Require legal notices        |
| Atomic install failure  | FS error                | "Update failed"       | Rollback              | Reinstall        | Keep old version             |
| Registry corruption     | Metadata load error     | "Repairing"           | Rebuild from FS       | Reinstall        | Fail safe                    |
| Model load failure      | Inference boot fails    | "Unavailable"         | Attempt repair        | Reinstall        | Fallback to text/system      |
| Tokenizer mismatch      | Boot validation         | "Update required"     | Update pack           | Update app       | Do not feed garbage text     |
| Runtime incompatibility | Boot validation         | "Update required"     | Fetch right pack      | Update app       | Block loading                |
| App crash in download   | Next app launch         | "Paused"              | Resume from temp      | Tap to resume    | Clean old temp files         |
| App crash in install    | Next app launch         | "Update failed"       | Rollback              | Reinstall        | Keep old version active      |
| Device restart          | Next launch             | "Paused"              | Resume download       | Tap to resume    | Clean old temp files         |
| Model update regression | Load/Inference fails    | "Unavailable"         | Rollback to old       | Use system TTS   | Rollback explicitly          |
| Revoked model           | Manifest fetch          | "Model disabled"      | Fallback              | Delete           | Stop loading                 |
| Low memory              | OS Warning              | Degraded mode         | Unload models         | None             | Prevent crash loop           |
| Thermal pressure        | OS Warning              | Degraded mode         | Unload models         | None             | Prevent crash loop           |
| Optional pack missing   | Boot check              | Baseline only         | Redownload in bg      | Tap to retry     | Proceed with baseline        |
| Deletion interrupted    | App launch              | "Deleting"            | Finish deletion       | Tap to retry     | Reclaim space safely         |

## 49. Security requirements

- HTTPS;
- allowlisted hosts;
- exact revision;
- checksums;
- signed manifest if adopted;
- no arbitrary URL;
- no loading before verification;
- path traversal protection;
- no executable code download;
- no user-supplied model in baseline;
- revoked-version support;
- safe rollback;
- integrity diagnostics;
- secure temporary storage.

## 50. Privacy requirements

- model files are not user conversation data;
- download hosts may receive normal network metadata;
- no FitCore personal data is needed to download models;
- download requests should not include user fitness records;
- model analytics disabled unless separately approved;
- no account should be required merely to download open model assets where avoidable;
- optional provider credentials remain separate.

## 51. Feasibility experiments

### Download

- fresh install; Wi-Fi; cellular if allowed; pause and resume; app termination; device restart; source timeout; checksum failure; insufficient storage.

### Storage

- minimum free space; low-storage warning; backup behavior; deletion; reinstall; registry repair.

### Runtime

- cold load; warm load; unload; memory warning; thermal warning; Low Power Mode; app suspension; 30- to 60-minute workout session.

### Update

- successful side-by-side update; failed health check; rollback; revoked model; incompatible manifest.

### Devices

- regular iPhone 15; iPhone 16.

## 52. Measurements

Require collection of:

- download bytes; installed bytes; peak temporary storage; download duration; resume success; checksum duration; install duration; cold-load time; warm-load time; peak memory; unload duration; storage reclaimed; update success; rollback success; failure rates; user-visible downtime.

## 53. Acceptance gates

- trusted manifest works;
- exact source revisions pinned;
- licenses approved;
- resumable downloads work;
- interrupted downloads do not register;
- checksum failures fail closed;
- insufficient-storage behavior is clear;
- atomic installation works;
- previous version remains usable during failed update;
- model health checks work;
- rollback works;
- deletion does not affect FitCore data;
- backup policy is confirmed;
- both target phones load and unload safely;
- memory and thermal fallback works;
- partial-availability fallback is usable;
- no silent large download occurs;
- model status is visible;
- compromised model can be revoked.

## 54. Initial implementation recommendation

Conservative first implementation:

- one common baseline pack;
- no large optional variants initially;
- explicit first-time download;
- Wi-Fi recommendation;
- native Application Support storage;
- backup exclusion for re-downloadable weights;
- manifest pinned in the application release or securely fetched;
- SHA-256 verification;
- atomic install;
- model registry;
- load only when Jarvis or an active workout needs it;
- unload after inactivity or resource pressure;
- system TTS and deterministic-command fallback;
- manual approval for large updates;
- one prior version retained temporarily for rollback.

## 55. Deferred capabilities

- multiple interchangeable LLM packs;
- user-supplied models;
- arbitrary download URLs;
- automatic large cellular updates;
- peer-to-peer model distribution;
- delta patches;
- cross-device model synchronization;
- cloud-hosted personal model backups;
- background preload at every app launch;
- shipping every model inside the initial application bundle.

## 56. Rejected approaches

- loading unverified files;
- floating `main` revisions;
- storing large model weights in user Documents;
- silently downloading on cellular;
- deleting previous version before new version passes health checks;
- model update without rollback;
- treating model files as canonical user data;
- passing model files through the JavaScript bridge;
- bundling several gigabytes without evaluating App Store and install impact;
- depending on a runtime license check for core offline operation;
- exposing arbitrary model URLs;
- storing secrets in the model manifest;
- using temporary or cache storage for required offline models if the OS may purge them unexpectedly.

## 57. Repository integration map

| Current area       | Existing behavior                       | Model-lifecycle implication           | Gap                                                  | Confidence |
| ------------------ | --------------------------------------- | ------------------------------------- | ---------------------------------------------------- | ---------- |
| application build  | Vite build (`bun run build`)            | Static assets bundled                 | Needs mechanism to exclude large models              | High       |
| settings           | `src/components/app/views/settings.tsx` | Local storage config                  | Needs model management UI section                    | High       |
| storage management | `src/lib/atomic-persistence.ts` etc     | Saves small user data to localStorage | Large files cannot use localStorage                  | High       |
| error display      | React error boundaries                  | Shows text errors                     | Needs to handle model download errors gracefully     | High       |
| reset behavior     | App settings clear                      | Clears user data                      | Model deletion must be separate from user data reset | High       |

## 58. Open questions

- exact baseline asset sizes;
- final model filenames;
- final hosting source;
- whether production should mirror official files;
- exact free-space safety buffer;
- exact preload trigger;
- exact warm-idle timeout;
- exact backup exclusion;
- exact retained rollback duration;
- exact manifest-signing approach;
- exact cellular-download threshold;
- whether TTS is included in the core pack;
- whether the iPhone 16 receives an optional separate pack;
- long-term bandwidth cost.

## 59. Final recommendation summary

- **pack strategy**: Core pack required, deferred optional packs.
- **bundle-versus-download decision**: Download after install.
- **storage location**: Application Support, excluded from backup.
- **source policy**: Official source or verified FitCore mirror.
- **manifest**: Release-pinned or securely fetched.
- **resumable download**: URLSession-based, partial files invalid until done.
- **integrity verification**: SHA-256 before install.
- **atomic installation**: File swap to prevent corruption.
- **registry**: Local metadata tracking installed state.
- **loading and unloading**: Load on demand (Jarvis open), unload on pressure.
- **update and rollback**: Manual updates, retain n-1 version for rollback.
- **deletion**: Explicit user control, no FitCore data deleted.
- **fallback**: Apple TTS, deterministic text-only fallback.
- **most important unresolved risk**: Exact bandwidth cost and device thermal limitations.
- **required feasibility gate**: Resumable download and memory threshold testing on iPhone 15.

## 60. References

- Apple Developer Documentation: File System Programming Guide (https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/Introduction/Introduction.html, Access date: Current, Claim: Application Support directory behavior)
- Apple Developer Documentation: URLSession (https://developer.apple.com/documentation/foundation/urlsession, Access date: Current, Claim: Background downloads and resume behavior)
- Hugging Face Model Hub Documentation (https://huggingface.co/docs/hub/models-downloading, Access date: Current, Claim: Standard pinning and checksum procedures)
