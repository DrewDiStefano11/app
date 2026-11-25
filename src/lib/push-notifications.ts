export type NotificationAvailability = "supported" | "install" | "unsupported";

export function notificationAvailability(): NotificationAvailability {
  if (typeof window === "undefined" || !window.isSecureContext) return "unsupported";
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installed = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (ios && !installed) return "install";
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window ? "supported" : "unsupported";
}

export async function browserPushStatus() {
  if (notificationAvailability() !== "supported") return { permission: "default" as NotificationPermission, subscribed: false, expired: false };
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  return { permission: Notification.permission, subscribed: !!subscription,
    expired: subscription?.expirationTime != null && subscription.expirationTime <= Date.now() };
}

/** Must be invoked directly from the user's click, before any asynchronous work. */
export async function sendNotificationTest() {
  if (notificationAvailability() !== "supported") throw new Error("Notifications are unavailable in this browser. On iPhone, open FitCore from the Home Screen.");
  const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") throw new Error(permission === "denied" ? "Notifications are blocked. Allow them in your browser or device settings to try again." : "Notification permission was not granted. You can try again when ready.");
  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration?.active) throw new Error("FitCore is still preparing notifications. Reopen the app and try again.");
  await registration.showNotification("FitCore test notification", {
    body: "Notifications can display on this device. Scheduled push reminders are not enabled.",
    icon: "/icon-192.png", badge: "/icon-192.png", tag: "fitcore-notification-test",
    data: { url: "/" },
  });
}

/** Browser revocation needs no server access and creates no replacement subscription. */
export async function removeBrowserPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const removed = await subscription.unsubscribe();
  if (!removed && await registration!.pushManager.getSubscription()) throw new Error("Could not remove this device's subscription. Try again.");
}
