import { expect, test } from "@playwright/test";

test("serves the FitCore privacy policy to signed-out visitors", async ({ request }) => {
  const response = await request.get("/privacy", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  const html = await response.text();
  expect(html).toContain("<title>Privacy Policy | FitCore</title>");
  expect(html).toContain("FitCore Privacy Policy");
  expect(html).toContain("AI features");
  expect(html).toContain("Export and deletion");
  expect(html).toContain("Back to FitCore");
});
