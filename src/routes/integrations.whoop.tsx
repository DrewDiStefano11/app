import { createFileRoute, Link } from "@tanstack/react-router";
import { WhoopSettings } from "@/components/app/views/whoop-settings";

export const Route = createFileRoute("/integrations/whoop")({
  validateSearch: (search: Record<string, unknown>) => {
    const result = search.whoop;
    return {
      whoop:
        result === "connected" ||
        result === "cancelled" ||
        result === "failed" ||
        result === "restart"
          ? result
          : undefined,
    };
  },
  head: () => ({
    meta: [{ title: "WHOOP connection | FitCore" }, { name: "robots", content: "noindex" }],
  }),
  component: WhoopConnection,
});

function WhoopConnection() {
  const { whoop } = Route.useSearch();
  return (
    <main className="mx-auto max-w-xl space-y-5 px-5 py-8">
      <h1 className="text-3xl font-bold">WHOOP connection</h1>
      {whoop === "restart" && (
        <p role="status" className="text-sm">
          FitCore could not verify this authorization in the current browser. Unlock WHOOP if
          prompted, then start the connection here.
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        If you connected in Safari, return to your installed FitCore app from the Home Screen.
      </p>
      <WhoopSettings returnResult={whoop === "cancelled" || whoop === "failed" ? whoop : undefined} />
      <Link to="/" className="inline-flex min-h-11 items-center text-primary underline">
        Back to FitCore
      </Link>
    </main>
  );
}
