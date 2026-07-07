# UX Gap Backlog: FitCore

This backlog identifies UX and product gaps discovered during the technical audit. Items are categorized and prioritized to guide future PRs.

## Home / Dashboard

| Title                    | Description                                                        | Priority | Timing | Safety | Dependencies |
| :----------------------- | :----------------------------------------------------------------- | :------- | :----- | :----- | :----------- |
| **Tile Customization**   | Users cannot hide or reorder dashboard tiles.                      | High     | Next   | Safe   | None         |
| **Score Explanation**    | "FitCore Score" lacks a breakdown of how it's calculated.          | Medium   | Soon   | Safe   | None         |
| **Empty State Guidance** | New users see many "No Data" states; needs better onboarding data. | Medium   | Soon   | Safe   | None         |

## Training

| Title                        | Description                                                          | Priority | Timing | Safety | Dependencies |
| :--------------------------- | :------------------------------------------------------------------- | :------- | :----- | :----- | :----------- |
| **Template Editor**          | Starter templates cannot be permanently edited or renamed.           | High     | Next   | Safe   | None         |
| **Custom Template Creation** | No way to create a template from scratch without starting a workout. | Medium   | Soon   | Safe   | None         |
| **History Search**           | Finding a specific past workout is difficult as the list grows.      | Low      | Later  | Safe   | None         |

## Active Workout

| Title                      | Description                                                               | Priority | Timing | Safety | Dependencies |
| :------------------------- | :------------------------------------------------------------------------ | :------- | :----- | :----- | :----------- |
| **Rest Timer**             | No visual or audio feedback for rest periods between sets.                | High     | Next   | Safe   | None         |
| **RPE Logging**            | Rate of Perceived Exertion is not tracked (crucial for advanced lifters). | Medium   | Next   | Safe   | None         |
| **Plate Calc Persistence** | Bar weight in plate calculator resets every time.                         | Low      | Soon   | Safe   | None         |
| **Supersets**              | No UI support for grouping exercises into supersets/circuits.             | Medium   | Later  | Safe   | None         |

## Nutrition

| Title              | Description                                                    | Priority | Timing | Safety | Dependencies |
| :----------------- | :------------------------------------------------------------- | :------- | :----- | :----- | :----------- |
| **Water Tracking** | Hydration tracking is completely missing.                      | Medium   | Soon   | Safe   | None         |
| **Micronutrients** | Fiber, Sugar, and Saturated Fat are not tracked.               | Low      | Later  | Safe   | None         |
| **Meal Library**   | Users can't save "Custom Meals" for reuse outside of "Recent". | Medium   | Soon   | Safe   | None         |

## Recovery

| Title                    | Description                                                         | Priority | Timing | Safety | Dependencies |
| :----------------------- | :------------------------------------------------------------------ | :------- | :----- | :----- | :----------- |
| **Automatic Sleep Data** | Manual sleep logging is tedious; needs integration (HealthKit/etc). | High     | Later  | Safe   | None         |
| **HRV Integration**      | Heart Rate Variability is a key readiness metric currently ignored. | Medium   | Later  | Safe   | None         |

## Progress

| Title                 | Description                                          | Priority | Timing | Safety | Dependencies |
| :-------------------- | :--------------------------------------------------- | :------- | :----- | :----- | :----------- |
| **Photo Comparison**  | No way to view two progress photos side-by-side.     | Medium   | Soon   | Safe   | None         |
| **Body Measurements** | Tracking waist, chest, arms, etc., is not supported. | High     | Soon   | Safe   | None         |

## Settings / Personalization

| Title                | Description                                                     | Priority | Timing | Safety      | Dependencies      |
| :------------------- | :-------------------------------------------------------------- | :------- | :----- | :---------- | :---------------- |
| **Theme Selection**  | App is locked to a dark-centric premium UI; no Light Mode.      | Low      | Later  | Safe        | Premium UI PR     |
| **Unit Persistence** | Changing units (lb/kg) should retroactively update history/PRs. | High     | Soon   | **Caution** | Data Integrity PR |

## Mobile Usability & Accessibility

| Title                    | Description                                                       | Priority | Timing | Safety | Dependencies |
| :----------------------- | :---------------------------------------------------------------- | :------- | :----- | :----- | :----------- |
| **Haptic Feedback**      | Missing tactile feedback for successful logs or timer completion. | Medium   | Soon   | Safe   | None         |
| **Screen Reader Labels** | Many icon-only buttons lack descriptive ARIA labels.              | High     | Next   | Safe   | None         |
| **Font Scaling**         | UI may break at very large system font settings.                  | Medium   | Later  | Safe   | None         |

## Data Safety

| Title           | Description                                                  | Priority | Timing    | Safety | Dependencies |
| :-------------- | :----------------------------------------------------------- | :------- | :-------- | :----- | :----------- |
| **Auto-Backup** | Users may forget to export; needs "Last Exported" reminders. | Medium   | Soon      | Safe   | None         |
| **Cloud Sync**  | Optional (encrypted) cloud sync for multi-device usage.      | Low      | Long-term | Safe   | None         |

## AI Later

| Title                  | Description                                                          | Priority | Timing      | Safety      | Dependencies |
| :--------------------- | :------------------------------------------------------------------- | :------- | :---------- | :---------- | :----------- |
| **AI Workout Coach**   | Live suggestions during a workout based on previous set performance. | High     | After AI #2 | **Caution** | AI PR #2     |
| **Photo Food Logging** | Log meals by taking a photo instead of typing.                       | Medium   | After AI #2 | **Caution** | AI PR #2     |
| **Voice Logging**      | Full voice-command support for hands-free gym logging.               | Medium   | After AI #2 | **Caution** | AI PR #2     |
