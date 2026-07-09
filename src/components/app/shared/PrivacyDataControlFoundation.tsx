import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/app/ui";
import {
  Shield,
  Lock,
  HardDrive,
  Download,
  Trash2,
  ZapOff,
  Cloud,
  Database,
  Eye,
} from "lucide-react";

export type PrivacyControlStatus =
  | "planned"
  | "inactive"
  | "local-only"
  | "sensitive"
  | "destructive"
  | "cloud-sync";

export interface PrivacyControlRowProps {
  icon?: ReactNode;
  title: string;
  description: string;
  status?: PrivacyControlStatus;
  action?: ReactNode;
  className?: string;
}

export function PrivacyControlRow({
  icon,
  title,
  description,
  status,
  action,
  className,
}: PrivacyControlRowProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 border-b border-border/50 last:border-0",
        status === "destructive" && "text-destructive",
        className,
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && (
          <div
            className={cn(
              "shrink-0 mt-1",
              status === "destructive" ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h4
              className={cn(
                "text-sm font-semibold truncate",
                status === "destructive" ? "text-destructive" : "text-foreground",
              )}
            >
              {title}
            </h4>
            {status && <PrivacyStatusBadge status={status} />}
          </div>
          <p
            className={cn(
              "text-xs leading-relaxed",
              status === "destructive" ? "text-destructive/80" : "text-muted-foreground",
            )}
          >
            {description}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0 flex items-center justify-end">{action}</div>}
    </div>
  );
}

function PrivacyStatusBadge({ status }: { status: PrivacyControlStatus }) {
  const config = {
    planned: {
      label: "Planned",
      classes: "bg-muted text-muted-foreground border-muted-foreground/20",
    },
    inactive: {
      label: "Inactive",
      classes: "bg-muted/50 text-muted-foreground border-muted-foreground/20",
    },
    "local-only": {
      label: "Local Only",
      classes: "bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400",
    },
    sensitive: {
      label: "Sensitive",
      classes: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    },
    destructive: {
      label: "Danger",
      classes: "bg-destructive/10 text-destructive border-destructive/20",
    },
    "cloud-sync": {
      label: "Cloud Sync",
      classes: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400",
    },
  };

  const { label, classes } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider",
        classes,
      )}
    >
      {label}
    </span>
  );
}

export function PrivacyDataControlCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden flex flex-col p-0", className)}>
      <div className="p-4 sm:p-5 border-b border-border bg-muted/20">
        <h3 className="text-base font-semibold leading-none tracking-tight">{title}</h3>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="px-4 sm:px-5 flex-1">{children}</div>
    </Card>
  );
}

// Presentational scaffold implementation of the requested cards and rows
export function PrivacyDataControlScaffold() {
  return (
    <div className="space-y-6">
      <PrivacyDataControlCard
        title="AI Memory & Context"
        description="Manage what the AI knows about you to personalize your experience."
      >
        <PrivacyControlRow
          icon={<Database className="h-5 w-5" />}
          title="AI Memory Controls"
          description="View and manage facts the AI has learned about you over time."
          status="planned"
        />
        <PrivacyControlRow
          icon={<Shield className="h-5 w-5" />}
          title="Category-Based Memory"
          description="Enable or disable AI memory for specific categories like nutrition or workouts."
          status="planned"
        />
        <PrivacyControlRow
          icon={<ZapOff className="h-5 w-5" />}
          title="Reduced-History / Privacy Mode"
          description="Limit the amount of context the AI uses for future insights."
          status="inactive"
        />
        <PrivacyControlRow
          icon={<Eye className="h-5 w-5" />}
          title="Source Visibility"
          description="See exactly why the AI knows certain facts or generated a specific insight."
          status="planned"
        />
      </PrivacyDataControlCard>

      <PrivacyDataControlCard
        title="Data Storage & Sync"
        description="Control where your data is stored and how it is backed up."
      >
        <PrivacyControlRow
          icon={<HardDrive className="h-5 w-5" />}
          title="Local-Only Data"
          description="Some health data is stored strictly on this device and never leaves it."
          status="local-only"
        />
        <PrivacyControlRow
          icon={<Cloud className="h-5 w-5" />}
          title="Cloud Sync Approval"
          description="Approve or revoke permission to securely sync data across your devices."
          status="cloud-sync"
        />
        <PrivacyControlRow
          icon={<Lock className="h-5 w-5" />}
          title="Sensitive Data Locks"
          description="Add an extra layer of protection to highly sensitive health metrics."
          status="sensitive"
        />
      </PrivacyDataControlCard>

      <PrivacyDataControlCard
        title="Export & Deletion"
        description="You have full control over your data. Export it anytime or delete it permanently."
      >
        <PrivacyControlRow
          icon={<Download className="h-5 w-5" />}
          title="Export All Data"
          description="Download a complete copy of all your FitCore data in a machine-readable format."
          status="planned"
        />
        <PrivacyControlRow
          icon={<Trash2 className="h-5 w-5" />}
          title="Delete Account & Data"
          description="Permanently delete all your data. This action cannot be undone."
          status="destructive"
        />
      </PrivacyDataControlCard>
    </div>
  );
}
