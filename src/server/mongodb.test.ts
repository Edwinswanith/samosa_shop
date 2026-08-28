import { beforeEach, describe, expect, it, vi } from "vitest";

const { connect, db, MongoClient } = vi.hoisted(() => {
  const db = vi.fn(() => ({ name: "samosa_shop" }));
  const connect = vi.fn();
  const MongoClient = vi.fn(function MockMongoClient() { return { connect }; });
  return { connect, db, MongoClient };
});

vi.mock("mongodb", () => ({ MongoClient }));

describe("MongoDB connection cache", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MONGODB_URI", "mongodb://example.test");
    vi.stubEnv("MONGODB_DB", "samosa_shop");
    connect.mockReset();
    db.mockClear();
    MongoClient.mockClear();
    delete (globalThis as typeof globalThis & { __samosaMongoClientPromise?: unknown }).__samosaMongoClientPromise;
  });

  it("clears a failed connection so the next save can reconnect", async () => {
    connect.mockRejectedValueOnce(new Error("temporary connection failure"));
    connect.mockResolvedValueOnce({ db });
    const { getDatabase } = await import("./mongodb");

    await expect(getDatabase()).rejects.toThrow("temporary connection failure");
    await expect(getDatabase()).resolves.toEqual({ name: "samosa_shop" });
    expect(MongoClient).toHaveBeenCalledTimes(2);
  });

  it("reuses the connection across module reloads", async () => {
    connect.mockResolvedValue({ db });
    const firstModule = await import("./mongodb");
    await firstModule.getDatabase();
    vi.resetModules();
    const reloadedModule = await import("./mongodb");
    await reloadedModule.getDatabase();

    expect(MongoClient).toHaveBeenCalledTimes(1);
  });
});
