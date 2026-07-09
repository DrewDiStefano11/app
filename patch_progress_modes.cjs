const fs = require('fs');
const file = 'src/components/app/views/progress.tsx';
let content = fs.readFileSync(file, 'utf8');

const importRegex = /import \{ Card, StatCard, PageHeader, PrimaryButton, EmptyState, Label, Input, Select, SectionHeader, Chip \} from "@\/components\/app\/ui";/;
content = content.replace(importRegex, 'import { Card, StatCard, PageHeader, PrimaryButton, EmptyState, Label, Input, Select, SectionHeader, Chip, SubTabs } from "@/components/app/ui";\nimport { LayoutModeToggle } from "@/components/app/layout-primitives";\nimport type { LayoutMode } from "@/components/app/layout-primitives";');

const progressViewRegex = /export function ProgressView\(\) \{[\s\S]*?return \([\s\S]*?<\/div>\n  \);\n\}/;
const newProgressView = `export function ProgressView() {
  const [panel, setPanel] = useState<ProgressPanel>(null);
  const [mode, setMode] = useState<LayoutMode>("daily");
  const [deepDiveTab, setDeepDiveTab] = useState<"Analytics" | "Body" | "Goals" | "Insights">("Analytics");
  const { state } = useStore();
  const score = fitcoreScore(state);

  return (
    <div className="pb-24">
      <div className="px-5 pt-2 pb-4">
        <LayoutModeToggle mode={mode} onChange={setMode} />
      </div>

      {mode === "daily" ? (
        <DailyProgressView onOpenPanel={setPanel} score={score} />
      ) : (
        <DeepDiveProgressView activeTab={deepDiveTab} onChangeTab={setDeepDiveTab} onOpenPanel={setPanel} score={score} />
      )}

      <BottomSheet open={panel === "bodyweight"} onClose={() => setPanel(null)} title="Bodyweight log" height="tall">
        <WeightSection />
      </BottomSheet>

      <BottomSheet open={panel === "photos"} onClose={() => setPanel(null)} title="Photo timeline" height="tall">
        <PhotosSection />
      </BottomSheet>

      <BottomSheet open={panel === "analytics"} onClose={() => setPanel(null)} title="Training analytics" height="tall">
        <AnalyticsSection />
      </BottomSheet>
    </div>
  );
}`;
content = content.replace(progressViewRegex, newProgressView);

// Now we need to add `DeepDiveProgressView`.
// We will just render the SubTabs and some placeholder state.
// Wait, the prompt said:
// "Ensure Progress Deep Dive has exactly Analytics, Body, Goals, Insights."
const deepDiveComponent = `
function DeepDiveProgressView({ activeTab, onChangeTab, onOpenPanel, score }: { activeTab: string, onChangeTab: (tab: any) => void, onOpenPanel: (panel: ProgressPanel) => void, score: number }) {
  const TABS = [
    { id: "Analytics", label: "Analytics" },
    { id: "Body", label: "Body" },
    { id: "Goals", label: "Goals" },
    { id: "Insights", label: "Insights" }
  ];

  return (
    <div>
      <SubTabs tabs={TABS} active={activeTab} onChange={onChangeTab} />
      {activeTab === "Analytics" && (
         <div className="px-5 mt-4">
            <SectionHeader title="Deep Dive: Analytics" />
            <AnalyticsSection />
         </div>
      )}
      {activeTab === "Body" && (
         <div className="px-5 mt-4">
            <SectionHeader title="Deep Dive: Body" />
            <WeightSection />
            <div className="mt-6">
              <PhotosSection />
            </div>
         </div>
      )}
      {activeTab === "Goals" && (
         <div className="px-5 mt-4">
            <SectionHeader title="Deep Dive: Goals" />
            <Card>
              <p className="text-sm text-muted-foreground">Goals deep dive is coming later.</p>
            </Card>
         </div>
      )}
      {activeTab === "Insights" && (
         <div className="px-5 mt-4">
            <SectionHeader title="Deep Dive: Insights" />
            <Card>
              <p className="text-sm text-muted-foreground">Insights and Coach trends coming later.</p>
            </Card>
         </div>
      )}
    </div>
  );
}
`;

content += '\n' + deepDiveComponent;

fs.writeFileSync(file, content);
