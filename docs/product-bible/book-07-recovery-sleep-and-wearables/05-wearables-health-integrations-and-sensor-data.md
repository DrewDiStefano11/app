# 05 - Wearables, Health Integrations, and Sensor Data

FitCore enhances its recovery intelligence by ingesting objective sensor data from third-party wearables and health platforms. This data provides a passive, continuous stream of biological context.

## Supported Integrations (Planned/Future)

The goal is to support major health aggregators and specific high-value devices.

- **Apple Health / HealthKit:** The primary integration point for iOS users, aggregating data from the Apple Watch and other apps.
- **Fitbit:** Direct API integration for sleep, heart rate, and activity data.
- **WHOOP / Noop:** Integration for detailed recovery scores, sleep staging, and strain metrics.
- **Garmin (Future):** Integration for training load, Body Battery, and sleep.
- **Oura (Future):** Integration for detailed sleep and readiness metrics.

_Note: Do not claim these are fully implemented unless explicit repository evidence exists. They represent the planned integration roadmap._

## Sensor Types and Expected Use

FitCore is interested in specific subsets of sensor data that directly impact recovery and training readiness:

| Sensor Data Type                 | How FitCore Uses It                                                                                                   |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------- |
| **Sleep Duration/Quality**       | Core input for Readiness Score (Chapter 3).                                                                           |
| **Resting Heart Rate (RHR)**     | Trend analysis; elevated RHR suggests incomplete recovery or impending illness.                                       |
| **Heart Rate Variability (HRV)** | Key indicator of autonomic nervous system stress; used to modulate training intensity.                                |
| **Steps / Activity**             | Used to calculate Non-Exercise Activity Thermogenesis (NEAT) for nutrition context (Book 4) and general daily strain. |
| **Training Load / Strain**       | (From devices like WHOOP/Garmin) Used to estimate cardiovascular fatigue.                                             |
| **Respiratory Rate / Temp**      | Used as early warning signs for illness; can trigger suggestions for rest days.                                       |

## Data Freshness and Sync Status

Sensor data is only useful if it is current.

- **Freshness:** The UI (Book 5) must clearly indicate when data was last synced (e.g., "Last synced: 2 hours ago").
- **Stale Data:** If wearable data is older than 24 hours, FitCore should warn the user and heavily discount its weighting in the Readiness Score, relying more on subjective check-ins.

## Conflicting Data and Device Hierarchy

Users often wear multiple devices or use multiple apps that write to central repositories like Apple Health.

- **Conflict Resolution:** If WHOOP reports 6 hours of sleep and Apple Health reports 8 hours, FitCore needs a resolution mechanism.
- **Device Priority:** Users should be able to define a source hierarchy (e.g., "Always trust WHOOP for sleep over Apple Watch").
- **User Override:** As always, explicit manual user entry or correction overrides any imported sensor data.

## Import Permissions and Privacy Controls

Wearable data is highly sensitive health information.

- **Explicit Consent:** FitCore must request explicit permission before connecting to any health platform or device API.
- **Granular Control:** Users must be able to choose _which_ data types to sync (e.g., "Allow Sleep, Deny Heart Rate").
- **Local-First Storage:** Imported data should adhere to the local-first storage principles outlined in Book 2, ensuring user control over their data footprint.

## Local-First vs Cloud-Sync Considerations

- **Apple Health:** Typically queried locally on the iOS device. FitCore should handle this efficiently without unnecessary cloud round-trips.
- **Cloud APIs (Fitbit, WHOOP):** Require server-to-server or OAuth flows. The architecture (Book 2) must securely handle these tokens and sync data back to the local client state.

## Open Questions

- Should FitCore attempt background syncing for cloud APIs (like WHOOP) to ensure data is fresh upon app open, or only sync on-demand when the user foregrounds the app?
- How should we handle historical data backfill when a user connects a new wearable? (e.g., import the last 30 days to establish baselines?)
