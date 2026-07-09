import { Card } from "@/components/app/ui";

export function IntegrationsDevicesFoundation() {
  const integrations = [
    { name: "Apple Health", status: "planned", description: "Sync health and activity data automatically." },
    { name: "Google Fit", status: "planned", description: "Connect your Android device metrics." },
    { name: "Wearables", status: "coming-later", description: "Garmin, Oura, Whoop, and more." },
    { name: "Smart Scale", status: "not-connected", description: "Log your body weight and composition." },
    { name: "Food/Macros Camera", status: "planned", description: "AI-powered meal scanning." },
    { name: "Health Sensors", status: "coming-later", description: "Continuous glucose monitors and HRVs." },
    { name: "Training Devices", status: "coming-later", description: "Smart barbells, power meters, and ergometers." },
    { name: "Sleep/Recovery Devices", status: "planned", description: "Smart mattresses and recovery trackers." }
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Integrations & Devices</h2>
      <p className="text-sm text-muted-foreground">Connect external services and devices.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {integrations.map((item) => (
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
