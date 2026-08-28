import { describe, expect, it } from "vitest";
import { isBusinessDateClosed } from "./closing";

describe("daily closing guard", () => {
  it("locks a closed business date", () => {
    expect(isBusinessDateClosed([{ businessDate: "2026-08-27", status: "closed" }], "2026-08-27")).toBe(true);
  });

  it("leaves an open date writable", () => {
    expect(isBusinessDateClosed([{ businessDate: "2026-08-27", status: "open" }], "2026-08-27")).toBe(false);
  });
});
