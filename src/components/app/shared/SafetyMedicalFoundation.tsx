import { Card } from "@/components/app/ui";

export function SafetyMedicalFoundation() {
  const safetyItems = [
    { name: "Allergies", status: "sensitive", description: "Manage active allergies and intolerances." },
    { name: "Medications", status: "sensitive", description: "Current prescriptions and supplements." },
    { name: "Surgeries", status: "inactive", description: "Past procedures and related clearance." },
    { name: "Blood Type", status: "planned", description: "Vital blood group information." },
    { name: "Conditions", status: "sensitive", description: "Chronic conditions and diagnoses." },
    { name: "Emergency Contacts", status: "emergency-profile", description: "Primary contacts in case of emergency." },
    { name: "Injury Red Flags", status: "sensitive", description: "Movements or zones to strictly avoid." },
    { name: "Care Recommendation Status", status: "planned", description: "Provider clearance for activities." },
    { name: "Lock-screen Support", status: "planned", description: "Widget access for vital information." }
  ];

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">Safety & Medical</h2>
      <p className="text-sm text-muted-foreground">Manage your health profile securely.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {safetyItems.map((item) => (
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
