import { expect, test } from "@playwright/test";

test("hydrates the payment island and validates input locally", async ({ page }) => {
  const cspErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy/i.test(message.text())) {
      cspErrors.push(message.text());
    }
  });

  await page.goto("/buy/");
  await expect(page.locator("astro-island")).not.toHaveAttribute("ssr", "");

  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByRole("alert")).toHaveText("Введите почту.");

  await page.getByLabel("Почта аккаунта Acrab").fill("reader@example.com");
  await page.getByRole("button", { name: "Получить код" }).click();
  await expect(page.getByRole("alert")).toContainText("отдельное согласие");
  expect(cspErrors).toEqual([]);
});
