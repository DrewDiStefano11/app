import { expect, test } from "@playwright/test";
test("the registered WHOOP callback fails closed without configuration", async ({ request }) => {
  const response = await request.get("/api/whoop/callback?code=synthetic&state=AbcDeF01", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(503);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.text()).toBe("");
});
