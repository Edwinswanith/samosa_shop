import { expect, test } from "@playwright/test";

test("owner can navigate and open the quick entry workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good afternoon/i })).toBeVisible();
  await page.getByRole("button", { name: "New entry" }).click();
  await expect(page.getByRole("dialog", { name: "New shop entry" })).toBeVisible();
  await page.getByRole("button", { name: "Purchase" }).click();
  await expect(page.getByLabel("Vendor")).toBeVisible();
  await expect(page.getByText("₹14.00")).toBeVisible();
});

test("inventory and reports remain available on mobile", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Inventory", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: /ordered and on the shelf/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vegetable orders" })).toBeVisible();
  await page.getByRole("button", { name: "Reports", exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole("heading", { name: /Cash flow is not profit/i })).toBeVisible();
});

test("customer settlement and LPG refill flows open with reconciled defaults", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Record payment" }).click();
  await expect(page.getByRole("dialog", { name: "Record customer payment" })).toBeVisible();
  await expect(page.getByLabel("Amount received")).toHaveValue("1004.00");
  await page.getByRole("button", { name: "Close customer payment" }).click();

  await page.getByRole("button", { name: "More", exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Record refill" }).click();
  await expect(page.getByRole("dialog", { name: "Record LPG refill" })).toBeVisible();
  await expect(page.getByLabel("Refill amount")).toHaveValue("2600.00");
});

test("vegetable rates save and can become the vendor primary rates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Inventory", exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Edit vegetable order 2026-08-27" }).click();
  await expect(page.getByLabel("Update primary vendor rates")).toBeChecked();
  await expect(page.getByText(/future orders from Ravi Vegetables/i)).toBeVisible();
  await expect(page.getByLabel("Rate / unit").first()).toHaveValue("25");
  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByRole("dialog", { name: "Edit vegetable order" })).toBeHidden();
  await expect(page.getByText("₹717.00")).toBeVisible();
});
