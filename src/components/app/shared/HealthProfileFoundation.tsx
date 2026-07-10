import { ReactNode } from "react";
import { Card, SectionHeader } from "@/components/app/ui";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Pill,
  Stethoscope,
  Heart,
  Ban,
  Syringe,
  Settings,
  ShieldAlert,
} from "lucide-react";

interface HealthProfileSectionProps {
  title: string;
  icon?: ReactNode;
  status: "Planned" | "Inactive" | "Local-Only";
  description?: string;
  children?: ReactNode;
}

function StatusLabel({ status }: { status: "Planned" | "Inactive" | "Local-Only" }) {
  const getStatusColor = () => {
    switch (status) {
      case "Planned":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Inactive":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      case "Local-Only":
        return "bg-green-500/10 text-green-500 border-green-500/20";
    }
  };

  return (
    <span
      className={cn(
        "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
        getStatusColor(),
      )}
    >
      {status}
    </span>
  );
}

function HealthProfileCard({
  title,
  icon,
  status,
  description,
  children,
}: HealthProfileSectionProps) {
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <StatusLabel status={status} />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {children && <div className="pt-2 border-t border-border/50">{children}</div>}
    </Card>
  );
}

export function HealthProfileFoundation() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-full overflow-hidden">
      <div className="flex flex-col gap-4">
        <SectionHeader title="Health Profile" />
        <p className="text-sm text-muted-foreground px-1">
          These settings will form the foundation for medical, injury, and physical limitations.
          This section is currently presentational and local-only.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HealthProfileCard
          title="Body Metrics"
          icon={<Activity className="w-4 h-4" />}
          status="Planned"
          description="Track height, weight, and other physical measurements."
        />

        <HealthProfileCard
          title="Injury History"
          icon={<AlertTriangle className="w-4 h-4" />}
          status="Local-Only"
          description="Log past injuries to inform safer training recommendations."
        />

        <HealthProfileCard
          title="Current Limitations"
          icon={<Ban className="w-4 h-4" />}
          status="Planned"
          description="Active restrictions on movement or exercise volume."
        />

        <HealthProfileCard
          title="Medications"
          icon={<Pill className="w-4 h-4" />}
          status="Inactive"
          description="List active prescriptions and supplements."
        />

        <HealthProfileCard
          title="Allergies"
          icon={<ShieldAlert className="w-4 h-4" />}
          status="Inactive"
          description="Food and environmental allergies."
        />

        <HealthProfileCard
          title="Surgeries"
          icon={<Syringe className="w-4 h-4" />}
          status="Planned"
          description="Past surgical procedures and recovery status."
        />

        <HealthProfileCard
          title="Conditions"
          icon={<Stethoscope className="w-4 h-4" />}
          status="Planned"
          description="Chronic or acute medical conditions."
        />

        <HealthProfileCard
          title="Recovery Preferences"
          icon={<Heart className="w-4 h-4" />}
          status="Local-Only"
          description="Preferred recovery modalities and rest parameters."
        />

        <HealthProfileCard
          title="Training Limitations"
          icon={<Settings className="w-4 h-4" />}
          status="Planned"
          description="Specific bounds for resistance, cardio, or frequency."
        />
      </div>
    </div>
  );
}
