import { beforeEach, describe, expect, it, vi } from "vitest";

const { createIndexes, getDatabase } = vi.hoisted(() => {
  const createIndexes = vi.fn().mockResolvedValue([]);
  return { createIndexes, getDatabase: vi.fn().mockResolvedValue({ collection: vi.fn(() => ({ createIndexes })) }) };
});

vi.mock("./mongodb", () => ({ getDatabase }));

import { ensureOperationIndexes, vegetableFromMongo } from "./operationsRepository";

describe("operations repository mapping", () => {
  beforeEach(() => {
    createIndexes.mockClear();
    getDatabase.mockClear();
  });

  it("restores shopId when a MongoDB vegetable order is sent back to the editor", () => {
    expect(vegetableFromMongo({
      _id: "mongo-id", id: "vegetables-2026-08-27", shopId: "main-shop", businessDate: "2026-08-27",
      vendorId: "ravi", createdAt: "2026-08-27T06:30:00.000Z", updatedAt: "2026-08-27T06:30:00.000Z",
      items: [{ id: "potato", name: "Potato", quantity: "20", unit: "kg", rate: "25", amount: "500" }],
    })).toMatchObject({ shopId: "main-shop", id: "vegetables-2026-08-27", vendorId: "ravi" });
  });

  it("reuses operation index setup instead of repeating it for every save", async () => {
    await Promise.all([ensureOperationIndexes(), ensureOperationIndexes()]);
    await ensureOperationIndexes();

    expect(getDatabase).toHaveBeenCalledTimes(1);
    expect(createIndexes).toHaveBeenCalledTimes(8);
  });
});
