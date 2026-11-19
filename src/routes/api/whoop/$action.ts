import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { handleWhoopRequest } from "../../../lib/whoop/request.server";

export const Route = createFileRoute("/api/whoop/$action")({
  server: {
    handlers: {
      GET: ({ request, params }) => handleWhoopRequest(request, params.action),
      POST: ({ request, params }) => handleWhoopRequest(request, params.action),
      DELETE: ({ request, params }) => handleWhoopRequest(request, params.action),
    },
  },
});
