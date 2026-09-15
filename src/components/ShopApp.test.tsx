import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShopApp } from "./ShopApp";

function installLocalStorage() {
  const saved = new Map<string, string>();
  Object.defineProperty(window, "localStorage", { configurable: true, value: {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
    clear: () => saved.clear(),
  } });
}

describe("ShopApp", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    window.localStorage?.clear?.();
  });

  it("shows the daily operating summary", () => {
    render(<ShopApp />);
    expect(screen.getByRole("heading", { name: /good afternoon/i })).toBeInTheDocument();
    expect(screen.getByText("Overall sales")).toBeInTheDocument();
    expect(screen.getByText("₹10,616.50")).toBeInTheDocument();
    expect(screen.getByText("₹9,493.50")).toBeInTheDocument();
    expect(screen.getAllByText("₹20,110.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /sales by business date/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
    expect(screen.getAllByText("VIT E Block Hostel").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VIT Canteen").length).toBeGreaterThan(0);
    expect(screen.getAllByText("24 August 2026").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₹10,110.00").length).toBeGreaterThan(0);
  });

  it("opens a customer payment prefilled to close sales through a selected date", () => {
    render(<ShopApp />);
    const eBlockAccount = screen.getByRole("region", { name: "VIT E Block Hostel credit account" });
    fireEvent.click(within(eBlockAccount).getByRole("button", { name: "Record payment" }));
    expect(screen.getByRole("dialog", { name: "Record customer payment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Amount received")).toHaveValue("1004.00");
    fireEvent.change(screen.getByLabelText("Close sales through"), { target: { value: "2026-08-27" } });
    expect(screen.getByLabelText("Amount received")).toHaveValue("10110.00");
  });

  it("chooses a VIT customer location when recording a University sale", () => {
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: /add entry/i })[0]);
    fireEvent.change(screen.getByLabelText("Channel"), { target: { value: "University" } });

    expect(screen.getByLabelText("Customer location")).toHaveValue("university");
    expect(screen.getByRole("option", { name: "VIT E Block Hostel" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "VIT Canteen" })).toBeInTheDocument();
  });

  it("opens the fast entry sheet", () => {
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: /add entry/i })[0]);
    expect(screen.getByRole("dialog", { name: /new shop entry/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sale" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Purchase" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expense" }));
    expect(screen.getByRole("option", { name: "Equipment investment" })).toBeInTheDocument();
  });

  it("shows a collapsible date-wise expense ledger without sales", () => {
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Daily Entry" })[0]);
    const ledger = screen.getByRole("region", { name: "Daily expense ledger" });
    expect(within(ledger).getByRole("heading", { name: "Where the money went" })).toBeInTheDocument();
    expect(within(ledger).getByRole("button", { name: /31 August 2026.*₹12,000.00/ })).toHaveAttribute("aria-expanded", "true");
    expect(within(ledger).getByText("Kousal salary")).toBeInTheDocument();
    const august27 = within(ledger).getByRole("button", { name: /27 August 2026/ });
    fireEvent.click(august27);
    expect(august27).toHaveAttribute("aria-expanded", "true");
    expect(within(ledger).getAllByText("Equipment investment")).toHaveLength(2);
    expect(within(ledger).queryByText("Samosa")).not.toBeInTheDocument();
    expect(within(ledger).queryByText("Kathi roll")).not.toBeInTheDocument();
  });

  it("shows editable vegetable orders and operational monitors", () => {
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Inventory" })[0]);
    expect(screen.getByRole("heading", { name: "Vegetable orders" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("All vegetable bills paid");
    expect(screen.getByRole("status")).toHaveTextContent("Paid through 27 August 2026");
    expect(screen.getByText("Database auto-sync enabled")).toBeInTheDocument();
    expect(screen.getByText("76.6 kg")).toBeInTheDocument();
    expect(screen.getByText("14 kg")).toBeInTheDocument();
    expect(screen.getAllByText("500 g").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("heading", { name: "Maida" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sunflower oil" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dalda" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Peanut" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Malabar paratha" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chicken" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Chilli sauce" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Soy sauce" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pepper" })).toBeInTheDocument();
    const datedTotal = screen.getByLabelText("Order total for 2026-08-27");
    expect(datedTotal).toHaveTextContent("Rates pending");
    expect(datedTotal.parentElement).toHaveClass("orderDate");
    fireEvent.click(screen.getByRole("button", { name: "Edit vegetable order 2026-08-27" }));
    expect(screen.getByRole("dialog", { name: "Edit vegetable order" })).toBeInTheDocument();
    expect(screen.getByLabelText("Vegetable vendor")).toBeInTheDocument();
    expect(screen.getByLabelText("Payment status")).toHaveValue("Paid");
    expect(screen.getByLabelText("Paid on")).toHaveValue("2026-08-27");
    expect(screen.getAllByText("Rate / unit").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("Update primary vendor rates")).toBeChecked();
    expect(screen.getByText(/future orders from Ravi Vegetables/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close vegetable order" }));
    fireEvent.click(screen.getByRole("button", { name: "New vegetable order" }));
    expect(screen.getByLabelText("Payment status")).toHaveValue("Pending");
    expect(screen.queryByLabelText("Paid on")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close vegetable order" }));
    fireEvent.click(screen.getAllByRole("button", { name: "More" })[0]);
    expect(screen.getByText("LPG monitor")).toBeInTheDocument();
    expect(screen.getByText("2 cylinders · 1 in use")).toBeInTheDocument();
    expect(screen.getByText("₹4,600.00")).toBeInTheDocument();
    expect(screen.getByText("₹2,600.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /record refill/i }));
    expect(screen.getByRole("dialog", { name: "Record LPG refill" })).toBeInTheDocument();
    expect(screen.getByLabelText("Refill amount")).toHaveValue("2600.00");
    expect(screen.getByText("Salary monitor")).toBeInTheDocument();
    expect(screen.getByText("Kousal")).toBeInTheDocument();
    expect(screen.getByText(/Master.*₹1,000.00 \/ day/)).toBeInTheDocument();
    expect(screen.getAllByText(/24 August 2026.*31 August 2026/)).toHaveLength(2);
    expect(screen.getByText(/₹7,500.00 paid/)).toBeInTheDocument();
    expect(screen.getByText(/₹12,000.00 paid in latest period/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advances & rent" })).toBeInTheDocument();
    expect(screen.getByText(/₹64,450.00 paid/)).toBeInTheDocument();
    expect(screen.getByText(/₹25,000.00 pending/)).toBeInTheDocument();
  });

  it("applies a vegetable edit immediately while MongoDB sync continues", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "mongodb");
    installLocalStorage();
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => undefined));
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Inventory" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Edit vegetable order 2026-08-27" }));
    const rates = screen.getAllByLabelText("Rate / unit");
    ["26", "28", "100", "40", "50", "10"].forEach((rate, index) => fireEvent.change(rates[index], { target: { value: rate } }));
    fireEvent.click(screen.getByRole("button", { name: "Save order" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Edit vegetable order" })).not.toBeInTheDocument());
    expect(screen.getByText("₹737.00")).toBeInTheDocument();
    expect(screen.getByLabelText("Order total for 2026-08-27")).toHaveTextContent("₹737.00");
    expect(window.localStorage.getItem("samosa-shop-operations-outbox-v1")).toContain("2026-08-27");
    await waitFor(() => expect(window.localStorage.getItem("samosa-shop-transactions-outbox-v1")).toContain("investment-stand-rack-2026-08-27"));
    expect(window.localStorage.getItem("samosa-shop-transactions-outbox-v1")).toContain("investment-mixture-2026-08-27");

    cleanup();
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Inventory" })[0]);
    await waitFor(() => expect(screen.getByText("₹737.00")).toBeInTheDocument());
  });

  it("shows a dated notification after a vegetable bill is marked pending", () => {
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Inventory" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Edit vegetable order 2026-08-27" }));
    fireEvent.change(screen.getByLabelText("Payment status"), { target: { value: "Pending" } });
    expect(screen.queryByLabelText("Paid on")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save order" }));

    expect(screen.getByRole("status")).toHaveTextContent("1 vegetable bill pending");
    expect(screen.getByRole("status")).toHaveTextContent("27 August 2026");
  });

  it("retries a pending primary-rate update when the connection returns", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "mongodb");
    installLocalStorage();
    let orderSaveAttempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input) === "/api/operations" && init?.method === "PUT") {
        orderSaveAttempts += 1;
        return { ok: orderSaveAttempts > 1 } as Response;
      }
      return { ok: false } as Response;
    });
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Inventory" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Edit vegetable order 2026-08-27" }));
    const rates = screen.getAllByLabelText("Rate / unit");
    ["27", "28", "100", "40", "50", "10"].forEach((rate, index) => fireEvent.change(rates[index], { target: { value: rate } }));
    fireEvent.click(screen.getByRole("button", { name: "Save order" }));
    await waitFor(() => expect(orderSaveAttempts).toBe(1));
    expect(window.localStorage.getItem("samosa-shop-operations-outbox-v1")).toContain("\"rate\":\"27\"");
    expect(screen.getByText("Saved locally · database unavailable · retrying automatically")).toBeInTheDocument();

    window.dispatchEvent(new Event("online"));

    await waitFor(() => expect(orderSaveAttempts).toBe(2));
    expect(window.localStorage.getItem("samosa-shop-operations-outbox-v1")).toBe("[]");
    await waitFor(() => expect(screen.getByText("Synced to MongoDB")).toBeInTheDocument());
  });

  it("automatically confirms a successful MongoDB save without manual reconciliation", async () => {
    vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "mongodb");
    installLocalStorage();
    let savedOrder = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input) === "/api/operations" && init?.method === "PUT") {
        savedOrder = true;
        return { ok: true } as Response;
      }
      return { ok: false } as Response;
    });
    render(<ShopApp />);
    fireEvent.click(screen.getAllByRole("button", { name: "Inventory" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Edit vegetable order 2026-08-27" }));
    fireEvent.change(screen.getAllByLabelText("Rate / unit")[0], { target: { value: "29" } });
    fireEvent.click(screen.getByRole("button", { name: "Save order" }));

    await waitFor(() => expect(savedOrder).toBe(true));
    await waitFor(() => expect(window.localStorage.getItem("samosa-shop-operations-outbox-v1")).toBe("[]"));
    expect(screen.getByText("Synced to MongoDB")).toBeInTheDocument();
  });
});
