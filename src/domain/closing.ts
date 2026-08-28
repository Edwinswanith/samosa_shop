import type { DailyClosing } from "./types";

export function isBusinessDateClosed(closings: DailyClosing[], businessDate: string): boolean {
  return closings.some((closing) => closing.businessDate === businessDate && closing.status === "closed");
}
