import { expect, test } from "@playwright/test";

test.describe("contact form", () => {
  test("shows the full TCPA consent text, not a summary", async ({ page }) => {
    await page.goto("/contact");

    // The exact elements that make consent "express written consent".
    await expect(page.getByText("prior express written consent")).toBeVisible();
    await expect(
      page.getByText("consent is not a condition of purchase"),
    ).toBeVisible();
    await expect(page.getByText("replying STOP")).toBeVisible();
  });

  test("blocks submission without consent and explains why", async ({
    page,
  }) => {
    await page.goto("/contact");

    await page.getByRole("textbox", { name: "Full name" }).fill("Jane Doe");
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("jane@example.com");
    await page.getByRole("button", { name: /Request a call/ }).click();

    await expect(page.getByText("Please agree to be contacted")).toBeVisible();
  });

  test("reports field errors accessibly", async ({ page }) => {
    await page.goto("/contact");

    await page.getByRole("textbox", { name: "Full name" }).fill("J");
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("not-an-email");
    await page.getByRole("button", { name: /Request a call/ }).click();

    const alerts = page.getByRole("alert");
    await expect(alerts.first()).toBeVisible();
    await expect(
      page.getByText("Please enter a valid email address"),
    ).toBeVisible();
  });

  test("submits successfully and confirms", async ({ page }) => {
    await page.goto("/contact");

    await page.getByRole("textbox", { name: "Full name" }).fill("Jane Doe");
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill("e2e-jane@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("5555550142");
    await page.getByRole("textbox", { name: "ZIP code" }).fill("55101");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /Request a call/ }).click();

    await expect(page.getByText(/Thanks — we have your request/)).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("skip link moves focus to main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
  });

  test("learning centre filters produce shareable URLs", async ({ page }) => {
    await page.goto("/learn");
    await page.getByRole("link", { name: "Tools", exact: true }).click();
    await expect(page).toHaveURL(/type=tool/);
    // Filtering is server-rendered, so a reload keeps the same view.
    await page.reload();
    await expect(page).toHaveURL(/type=tool/);
  });
});
