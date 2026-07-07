import { useState } from "react";
import { Activity, Undo2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Card } from "../ui";
import { undoAuditEntry } from "@/lib/jarvis/tools";

export function JarvisActivityCard() {
  const { state, set } = useStore();
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? state.jarvisAudit : state.jarvisAudit.slice(0, 6);
  return (
    <section>
      <h3 className="font-semibold mb-2 flex items-center gap-2"><Activity size={16} />Jarvis Activity</h3>
      <Card className="space-y-2">
        {state.jarvisAudit.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet — anything Jarvis logs, suggests, or changes will show here.</p>}
        {items.map(a => (
          <div key={a.id} className="flex items-start justify-between gap-2 py-1 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.summary}</p>
              <p className="text-[10px] text-muted-foreground">
                {a.tool} · {new Date(a.createdAt).toLocaleString()} · {a.undone ? "undone" : a.status}
              </p>
              {a.originalText && <p className="text-xs italic text-muted-foreground truncate">"{a.originalText}"</p>}
            </div>
            {!a.undone && a.status === "logged" && (
              <button onClick={() => undoAuditEntry(a.id, state, set)} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-foreground">
                <Undo2 size={12} /> Undo
              </button>
            )}
          </div>
        ))}
        {state.jarvisAudit.length > 6 && (
          <button onClick={() => setExpanded(e => !e)} className="text-xs text-muted-foreground w-full text-center pt-1">
            {expanded ? "Show less" : `Show all ${state.jarvisAudit.length}`}
          </button>
        )}
      </Card>
    </section>
  );
}
