import { createDemoState } from "../src/domain/seed";
import { expect, test } from "@playwright/test";

test("owner can navigate and open the quick entry workflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Good afternoon/i })).toBeVisible();
  await page.getByRole("button", { name: "New entry" }).click();
  await expect(page.getByRole("dialog", { name: "New shop entry" })).toBeVisible();
  await page.getByLabel("Channel").selectOption("University");
  await expect(page.getByLabel("Customer location")).toHaveValue("university");
  await expect(page.getByLabel("Customer location").getByRole("option")).toHaveText(["VIT E Block Hostel", "VIT Canteen"]);
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

test("daily entry shows expandable expense-only history", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /^(Daily Entry|Entry)$/ }).filter({ visible: true }).click();
  const ledger = page.getByRole("region", { name: "Daily expense ledger" });
  await expect(ledger.getByRole("heading", { name: "Where the money went" })).toBeVisible();
  await expect(ledger.getByRole("button", { name: /31 August 2026.*₹12,000.00/ })).toHaveAttribute("aria-expanded", "true");
  await expect(ledger.getByText("Kousal salary")).toBeVisible();
  await ledger.getByRole("button", { name: /27 August 2026/ }).click();
  await expect(ledger.getByText("Equipment investment").first()).toBeVisible();
  await expect(ledger.getByText("Samosa", { exact: true })).toHaveCount(0);
  await expect(ledger.getByText("Kathi roll", { exact: true })).toHaveCount(0);
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

test("sales dashboard shows roll and cutlet variants after a fresh load", async ({ page }) => {
  const state = createDemoState();
  const template = state.transactions.find((entry) => entry.kind === "sale")!;
  state.products = state.products.filter((product) => ["samosa", "kathi-roll"].includes(product.id));
  state.transactions = ["chicken-roll", "paneer-roll", "veg-cutlet", "chicken-cutlet"].map((productId, i) => ({ ...template, id: productId, idempotencyKey: productId, productId, businessDate: "2026-10-13", quantity: String(i + 1), revenue: String((i + 1) * 100) }));
  await page.addInitScript((saved) => window.localStorage.setItem("samosa-shop-state-v1", JSON.stringify(saved)), state);
  await page.goto("/");
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText(["Date", "Samosa", "Kathi roll (chicken)", "Kathi roll (veg, paneer)", "Cutlet (veg)", "Cutlet (chicken)", "Daily sales"]);
  await expect(table.getByRole("row").nth(1).getByRole("cell")).toHaveText(["13 October 20262026-10-13", "0₹0.00", "1₹100.00", "2₹200.00", "3₹300.00", "4₹400.00", "₹1,000.00"]);
  await page.reload();
  await expect(table.getByRole("row").nth(1).getByRole("cell").last()).toHaveText("₹1,000.00");
  await page.getByRole("button", { name: "New entry" }).click();
  await expect(page.getByLabel("Product").getByRole("option")).toHaveText(["Samosa", "Kathi roll (chicken)", "Kathi roll (veg, paneer)", "Cutlet (veg)", "Cutlet (chicken)"]);
});
