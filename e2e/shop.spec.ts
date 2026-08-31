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
  await expect(page.getByRole("status")).toContainText("All vegetable bills paid");
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

test("paid staff salaries show their dated attendance basis", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "More", exact: true }).filter({ visible: true }).click();
  await expect(page.getByText("Kousal")).toBeVisible();
  await expect(page.getByText(/Master.*₹1,000.00 \/ day/)).toBeVisible();
  await expect(page.getByText(/₹7,500.00 paid/)).toBeVisible();
  await expect(page.getByText(/₹12,000.00 paid in latest period/)).toBeVisible();
});

test("vegetable rates save and can become the vendor primary rates", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Inventory", exact: true }).filter({ visible: true }).click();
  await page.getByRole("button", { name: "Edit vegetable order 2026-08-27" }).click();
  await expect(page.getByLabel("Update primary vendor rates")).toBeChecked();
  await expect(page.getByText(/future orders from Ravi Vegetables/i)).toBeVisible();
  const rates = page.getByLabel("Rate / unit");
  for (const [index, rate] of ["25", "30", "90", "80", "50", "10"].entries()) await rates.nth(index).fill(rate);
  await page.getByRole("button", { name: "Save order" }).click();
  await expect(page.getByRole("dialog", { name: "Edit vegetable order" })).toBeHidden();
  await expect(page.getByText("₹740.00")).toBeVisible();
});
