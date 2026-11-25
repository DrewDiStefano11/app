import { useEffect, useRef, useState } from "react";
import { browserPushStatus, notificationAvailability, removeBrowserPushSubscription, sendNotificationTest, type NotificationAvailability } from "@/lib/push-notifications";
import { GhostButton } from "./ui";

export function PushNotificationPreferences() {
  const [availability, setAvailability] = useState<NotificationAvailability>("unsupported");
  const [status, setStatus] = useState<Awaited<ReturnType<typeof browserPushStatus>> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      setAvailability(notificationAvailability());
      void browserPushStatus().then(value => { if (alive) setStatus(value); }).catch(() => {
        if (alive) setMessage("Could not check notification settings. Reopen Settings to try again.");
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { alive = false; window.removeEventListener("focus", refresh); };
  }, []);
  const run = async (action: "test" | "remove") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    try {
      // Calling directly here keeps the permission prompt in the click's user gesture.
      if (action === "test") await sendNotificationTest();
      else await removeBrowserPushSubscription();
      setStatus(await browserPushStatus());
      setMessage(action === "test" ? "Test notification sent. Scheduled push reminders remain off." : "This device's push subscription was removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update notifications. Try again.");
      setStatus(await browserPushStatus().catch(() => null));
    } finally { inFlight.current = false; setBusy(false); }
  };
  return <section aria-label="Device notifications" className="space-y-2 rounded-2xl border border-border p-3">
    <h4 className="text-sm font-semibold">Device notifications</h4>
    <p className="text-xs leading-relaxed text-muted-foreground">Scheduled push reminders are not enabled. You can test whether notifications display on this device. This does not schedule reminders.</p>
    {availability === "install" ? <p className="text-xs text-muted-foreground">On iPhone or iPad, add FitCore to your Home Screen, then open it there to test notifications. Requires iOS or iPadOS 16.4 or later.</p> : availability === "unsupported" ? <p className="text-xs text-muted-foreground">This browser does not support FitCore device notifications.</p> : <>
      <p className="text-xs text-muted-foreground">Permission: {status?.permission ?? "checking"}. {status?.subscribed ? status.expired ? "This device has an expired push subscription." : "This device has a push subscription." : "No push subscription on this device."}</p>
      <GhostButton disabled={busy || !status} onClick={() => { void run("test"); }}>Send test notification</GhostButton>
      {status?.subscribed && <GhostButton disabled={busy} onClick={() => { void run("remove"); }}>Remove device subscription</GhostButton>}
      <p className="text-xs text-muted-foreground">You can change notification permission in your browser or device settings.</p>
    </>}
    {message && <p role="status" className="text-xs">{message}</p>}
  </section>;
}
