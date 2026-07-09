import { Card } from "@/components/app/ui";

export function CoachProBusinessFoundation() {
  const features = [
    { name: "Premium/Pro Plan", status: "planned", description: "Access advanced metrics and insights." },
    { name: "Coach Dashboard", status: "coming-later", description: "Manage multiple clients from one place." },
    { name: "Client Sharing", status: "coming-later", description: "Share routines and progress with clients." },
    { name: "Gym/Business Mode", status: "not-active", description: "Tools for gym owners and managers." },
    { name: "PT Clinic Support", status: "coming-later", description: "Integration with physical therapy workflows." },
    { name: "Advanced AI Features", status: "planned", description: "Deeper analysis and predictive modeling." },
    { name: "Team/Member Management", status: "not-active", description: "Manage staff and member access." },
    { name: "Lifetime Purchase", status: "planned", description: "One-time payment for lifetime access." }
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Coach, Pro & Business</h2>
      <p className="text-sm text-muted-foreground">Advanced tools for professionals and businesses.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((item) => (
          <Card key={item.name} className="flex flex-col gap-3">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-semibold">{item.name}</h3>
              <div className="text-[10px] uppercase tracking-wider py-0.5 px-2 min-h-0 bg-muted/50 rounded-full border">
                {item.status.replace("-", " ")}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
