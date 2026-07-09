import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const baseUrl = new URL(request.url).origin;

        const text = ["User-agent: *", "Allow: /", `Sitemap: ${baseUrl}/sitemap.xml`].join("\n");

        return new Response(text, {
          headers: {
            "Content-Type": "text/plain",
          },
        });
      },
    },
  },
});
