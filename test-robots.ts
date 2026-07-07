import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/robots.txt")({
  loader: async ({ request }) => {
    const baseUrl = new URL(request.url).origin;

    const text = [
      "User-agent: *",
      "Allow: /",
      `Sitemap: ${baseUrl}/sitemap.xml`,
    ].join("\n");

    return new Response(text, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  },
});
