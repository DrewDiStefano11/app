const fs = require('fs');
const file = 'src/components/app/views/progress.tsx';
let content = fs.readFileSync(file, 'utf8');

// Also the user said:
// Ensure the “Bodyweight vs time” Sparkline appears directly on the main Progress Daily View. -> Yes, it is there.
// Ensure Progress Daily View has no subtabs. -> Yes.
// Ensure Progress Deep Dive has exactly Analytics, Body, Goals, Insights. -> Yes.
// Ensure exact text locators like “Body” and “Analytics” are visible, unique, and clickable where end-to-end tests expect them on the Card actions.
// Ensure there are no overlapping hidden/sr-only duplicate elements that can trigger Playwright strict-mode violations.

// The issue right now is that `AnalyticsSection` and `WeightSection` and `PhotosSection` are rendered both inside the `BottomSheet` AND inside the Deep Dive view.
// If both views are present in the DOM, then there might be strict mode violations because `WeightSection` renders "Log new" and "Bodyweight trend" and `Card`s.
// BUT `BottomSheet` content is usually lazy or just hidden. If hidden via `data-state="closed"`, it might still be in the DOM.
// Actually, `activeTab` rendering them conditionally is fine.
// BUT `BottomSheet` rendering them means they exist.
// Wait! We ONLY need the `BottomSheet` in Daily mode. In DeepDive mode, we just render them on the page.
// Let's modify the code so that the BottomSheets are only rendered conditionally or whatever.
// Wait, the strict mode violations earlier were specifically about:
// `getByRole('heading', { name: 'Progress' })`
// and `getByText('Body', { exact: true })`
// and `getByRole('button', { name: 'Analytics', exact: true })`

// To avoid duplicate text inside the DeepDive view and DailyView, we can render the BottomSheets ONLY in Daily view.
const replaceSheets = /<BottomSheet open=\{panel === "bodyweight"\} onClose=\{\(\) => setPanel\(null\)\} title="Bodyweight log" height="tall">\n\s*<WeightSection \/>\n\s*<\/BottomSheet>\n\n\s*<BottomSheet open=\{panel === "photos"\} onClose=\{\(\) => setPanel\(null\)\} title="Photo timeline" height="tall">\n\s*<PhotosSection \/>\n\s*<\/BottomSheet>\n\n\s*<BottomSheet open=\{panel === "analytics"\} onClose=\{\(\) => setPanel\(null\)\} title="Training analytics" height="tall">\n\s*<AnalyticsSection \/>\n\s*<\/BottomSheet>/g;

content = content.replace(replaceSheets, `{mode === "daily" && (
        <>
          <BottomSheet open={panel === "bodyweight"} onClose={() => setPanel(null)} title="Bodyweight log" height="tall">
            <WeightSection />
          </BottomSheet>
          <BottomSheet open={panel === "photos"} onClose={() => setPanel(null)} title="Photo timeline" height="tall">
            <PhotosSection />
          </BottomSheet>
          <BottomSheet open={panel === "analytics"} onClose={() => setPanel(null)} title="Training analytics" height="tall">
            <AnalyticsSection />
          </BottomSheet>
        </>
      )}`);

// We also need to fix `DailyProgressView` to make sure it doesn't have `<PageHeader title="Progress" ... />` inside it, which it doesn't.
// BUT `ProgressView` has `<PageHeader title="Progress" />` and the `DeepDive` view might introduce something else.

fs.writeFileSync(file, content);
