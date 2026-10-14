import { expect, test } from "@playwright/test";
import { luminance } from "./support/contrast";

test.describe("contact form", () => {
  test("shows the full TCPA consent text, not a summary", async ({ page }) => {
    await page.goto("/contact");

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
});

test.describe("transact pages", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const route of [
    "/contact",
    "/scope-of-appointment",
    "/do-not-contact",
  ]) {
    test(`${route} controls are at least 44x44`, async ({ page }) => {
      await page.goto(route);

      const small = await page
        .locator("main input, main select, main textarea, main button, main a")
        .evaluateAll((elements) =>
          elements.flatMap((element) => {
            if (
              element instanceof HTMLInputElement &&
              element.type === "hidden"
            )
              return [];
            const row = element.closest("label") ?? element;
            const box = row.getBoundingClientRect();
            if (box.width === 0 || box.height === 0) return [];
            const text = element.closest("p, li")?.textContent ?? "";
            const inRunningText =
              element instanceof HTMLAnchorElement &&
              text.length - (element.textContent ?? "").length > 30;
            if (inRunningText) return [];
            return box.width < 44 || box.height < 44
              ? [`${element.outerHTML.slice(0, 80)} ${box.width}x${box.height}`]
              : [];
          }),
        );

      expect(small).toEqual([]);
    });
  }

  test("contact phone link is large and tappable", async ({ page }) => {
    await page.goto("/contact");

    const link = page.locator('main a[href^="tel:"]').first();
    const style = await link.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        fontSize: parseFloat(computed.fontSize),
        minHeight: parseFloat(computed.minHeight),
      };
    });

    expect(style.fontSize).toBeGreaterThanOrEqual(32);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });

  test("an invalid touched email changes border colour and keeps its error text", async ({
    page,
  }) => {
    await page.goto("/contact");

    const email = page.getByRole("textbox", { name: "Email", exact: true });
    const border = () =>
      email.evaluate((element) => getComputedStyle(element).borderTopColor);
    const before = await border();

    await email.fill("not-an-email");
    await email.blur();
    const after = await border();

    expect(after).not.toBe(before);
    const [r, g, b] = after.match(/\d+/g)!.map(Number);
    const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    const ratio = (luminance("#f7f9fa") + 0.05) / (luminance(hex) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(3);

    await page.getByRole("button", { name: /Request a call/ }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });
});
