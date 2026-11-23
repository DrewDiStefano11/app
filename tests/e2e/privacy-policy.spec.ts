import { expect, test } from "@playwright/test";

test("serves the FitCore privacy policy to signed-out visitors", async ({ request }) => {
  const response = await request.get("/privacy", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/html");
  const html = await response.text();
  expect(html).toContain("<title>Privacy Policy | FitCore</title>");
  expect(html).toContain("FitCore Privacy Policy");
  expect(html).toContain("AI features");
  expect(html).toContain("Short voice recordings are optional");
  expect(html).toContain("does not save");
  expect(html).toContain('href="https://console.groq.com/docs/your-data"');
  expect(html).not.toContain("browser&#x27;s speech recognition");
  expect(html).toContain("Export and deletion");
  expect(html).toContain('href="mailto:ddistefano1210@gmail.com"');
  expect(html).toContain("Back to FitCore");
});
