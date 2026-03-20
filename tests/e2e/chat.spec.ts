import { test, expect } from "@playwright/test";

test.describe("Chat UI", () => {
  test("page loads with all UI elements", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator(".title")).toBeVisible();
    await expect(page.locator("#cost-value")).toHaveText("$0.000000");
    await expect(page.locator("#model-select")).toBeVisible();
    await expect(page.locator("#message-input")).toBeVisible();
    await expect(page.locator("#send-btn")).toBeVisible();
    await expect(page.locator(".provider-btn.active")).toHaveText("OpenRouter");
  });

  test("model dropdown populates on load", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    const options = page.locator("#model-select option");
    await expect(options).not.toHaveCount(0);
  });

  test("provider switching updates model dropdown", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Get OpenRouter models
    const orOptions = await page.locator("#model-select option").allTextContents();

    // Switch to AltLLM
    await page.locator('.provider-btn[data-provider="altllm"]').click();
    await page.waitForTimeout(500);

    const altOptions = await page.locator("#model-select option").allTextContents();
    expect(altOptions).not.toEqual(orOptions);
  });

  test("can send a message and receive streaming response", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Select first model
    const firstOption = await page.locator("#model-select option").first();
    const modelValue = await firstOption.getAttribute("value");
    if (modelValue) {
      await page.locator("#model-select").selectOption(modelValue);
    }

    // Type and send message
    await page.locator("#message-input").fill("Hello, tell me a short joke");
    await page.locator("#send-btn").click();

    // Verify user message appears
    await expect(page.locator(".message-user").last()).toBeVisible();

    // Wait for assistant response (with generous timeout for API call)
    await expect(page.locator(".message-assistant").last()).toBeVisible({ timeout: 15000 });

    // Verify assistant message has content
    const assistantContent = page.locator(".message-assistant .message-content").last();
    await expect(assistantContent).not.toBeEmpty({ timeout: 15000 });
  });
});
