import { beforeEach, describe, expect, it, vi } from "vitest";

const { connection } = vi.hoisted(() => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock("next/server", () => ({ connection }));

import Home from "./page";

describe("Home", () => {
  beforeEach(() => connection.mockClear());

  it("waits for a request before rendering date-dependent shop content", async () => {
    const page = await Home();

    expect(connection).toHaveBeenCalledOnce();
    expect(page).toBeTruthy();
  });
});
