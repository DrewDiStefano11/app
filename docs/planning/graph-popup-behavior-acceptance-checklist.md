# Graph Popup Behavior Acceptance Checklist

## Purpose
This document provides an acceptance checklist for the implementation of the graph popup and heatmap behavior. It defines the specific UI, behavior, and persistence requirements before coding begins. **Note: This is a docs-only planning file. No runtime app code is being modified. Features described here are planned, not necessarily implemented.**

## Scope
The scope includes the entry points to the graph popups, mode toggling, mobile sheet behavior, heatmap visualizations, empty/loading states, and data provenance displays within the graph popups.

## Product Bible Sources Checked
* Book 5 (UX/UI)
* Book 9 (Analytics, Insights, and the Health Twin)
* Book 10 (Testing/QA/Platform Engineering) if merged/existing.
* (Book 6 is reserved/future-domain and is not included).

## Graph Popup Entry Behavior
* Tapping a specific metric on a dashboard card (e.g., weekly volume, weight trend) should open the corresponding graph popup.
* The entry animation must use `transform: none` at 100% instead of `translateY(0)` to prevent creating a permanent containing block for children with `position: fixed`.

## Mode Toggle Behavior
* Graph popups must allow toggling between different time modes (e.g., 1W, 1M, 3M, YTD, All).
* Toggling the mode should seamlessly update the data without closing the popup or causing jarring layout shifts.

## Requirement That Graph Mode Left Inside Popup Remains the Displayed Mode Outside Popup
* When a user changes the time mode within the graph popup and then closes it, the dashboard card from which it was opened must persist and display the newly selected mode.

## Graph Readability
* Graphs must maintain high contrast and readability on mobile devices.
* Labels, axes, and tooltips must be clearly legible and avoid overlapping.

## Mobile Popup/Sheet Behavior
* Graph popups must utilize the centralized `BottomSheet` component.
* They should use dynamic viewport height (`dvh`) units to ensure correct vertical positioning across mobile browsers with dynamic toolbars.
* Background interaction should be disabled while the popup is open (using `bg-black/85` and `backdrop-blur-md`).

## Empty/Loading/Error States
* Clear loading indicators (e.g., skeletons) must be shown while graph data is fetched.
* Empty states should provide helpful copy directing the user on how to populate the data.
* Error states should offer a clear path to retry or explain the issue gracefully.

## Data Source/Confidence Label Expectations
* If graph data points are AI-estimated (e.g., body fat percentage from a photo), they must clearly display their source and confidence level (e.g., "AI Estimate - Low Confidence").
* A distinction must be visually apparent between verified/manual data and AI-generated data on the graph.

## Dashboard Card Relationship
* The graph popup acts as an expanded, detailed view of the dashboard card.
* Data updates within the popup must seamlessly propagate to the dashboard card upon closure.

## Body Heatmap Requirements
* A body heatmap should visually represent muscle fatigue, soreness, or volume.
* The heatmap must accurately map underlying data (e.g., sets performed per muscle group) to visual intensity.

## Both Sides of Body Requirement
* The body heatmap must display both the front and back views of the body, allowing users to toggle between them or view them side-by-side to assess overall fatigue.

## FitCore Score Explanation Popup Relationship
* If a graph metric directly impacts the FitCore Score, there should be a clear contextual link or pathway to the FitCore Score explanation popup from within the graph view.

## Acceptance Checklist
- [ ] Tapping a dashboard card metric opens the correct graph popup.
- [ ] Time mode toggles (1W, 1M, etc.) update data seamlessly.
- [ ] Mode selected inside the popup persists on the dashboard card upon close.
- [ ] Graphs are highly readable on mobile viewports.
- [ ] `BottomSheet` and `dvh` units are used correctly for popup layout.
- [ ] Empty, loading, and error states are fully implemented and styled.
- [ ] Data points show appropriate provenance (Manual, Verified, Jarvis, Camera) and confidence badges.
- [ ] Body heatmap accurately visualizes data intensity.
- [ ] Both front and back views of the body heatmap are available.
- [ ] Entry animation uses `transform: none` at 100% to avoid fixed positioning bugs.

## Failure Examples
* The graph time range changes inside the popup but reverts back when returning to the dashboard.
* The graph overflows the viewport horizontally on smaller devices.
* The body heatmap only shows the front side, obscuring back/leg fatigue.
* AI-estimated data points are presented on the graph without confidence or source indicators, misleading the user.

## Suggested Future PR Breakdown
1. **Component Prep:** Update `BottomSheet` and standardize mode toggle state management.
2. **Graph Implementation:** Implement base graph rendering, loading/empty states, and data provenance tooltips.
3. **Heatmap Implementation:** Implement front/back body heatmap visualizations.
4. **Integration:** Hook up dashboard card entry points and ensure mode persistence outside the popup.

## Final Acceptance Matrix
| Requirement | Status | Notes |
| :--- | :--- | :--- |
| Mobile Sheet Layout | Ready | Must enforce `transform: none` rule |
| Mode Persistence | Pending | Requires state management audit |
| Empty/Error States | Ready | Standardized components available |
| Heatmap Front/Back | Pending | Requires specific SVG assets |
