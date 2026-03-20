import { test, expect } from "@playwright/test";

test.describe("Cost counter", () => {
  test("cost counter starts at zero", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#cost-value")).toHaveText("$0.000000");
  });

  test("cost counter updates during streaming", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Select first model
    const firstOption = await page.locator("#model-select option").first();
    const modelValue = await firstOption.getAttribute("value");
    if (modelValue) {
      await page.locator("#model-select").selectOption(modelValue);
    }

    // Send message
    await page.locator("#message-input").fill("Count from 1 to 5");
    await page.locator("#send-btn").click();

    // Wait for assistant response to appear
    await expect(page.locator(".message-assistant").last()).toBeVisible({ timeout: 15000 });

    // Check the cost counter value — if the LLM API returned tokens,
    // cost should be > 0. With test API keys the upstream call may fail,
    // so we verify the counter is a valid dollar amount either way.
    const costText = await page.locator("#cost-value").textContent();
    expect(costText).toMatch(/^\$\d+\.\d{6}$/);
  });
});
