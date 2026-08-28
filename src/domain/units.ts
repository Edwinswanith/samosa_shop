import Decimal from "decimal.js";
import type { BaseUnit, Unit } from "./types";
import { decimal } from "./decimal";

type Dimension = "weight" | "volume" | "count";

const unitDefinitions: Record<Unit, { factor: string; baseUnit: BaseUnit; dimension: Dimension }> = {
  kg: { factor: "1000", baseUnit: "g", dimension: "weight" },
  g: { factor: "1", baseUnit: "g", dimension: "weight" },
  l: { factor: "1000", baseUnit: "ml", dimension: "volume" },
  ml: { factor: "1", baseUnit: "ml", dimension: "volume" },
  piece: { factor: "1", baseUnit: "piece", dimension: "count" },
  packet: { factor: "1", baseUnit: "packet", dimension: "count" },
  box: { factor: "1", baseUnit: "box", dimension: "count" },
  bottle: { factor: "1", baseUnit: "bottle", dimension: "count" },
  cylinder: { factor: "1", baseUnit: "cylinder", dimension: "count" },
};

export function normalizeQuantity(quantity: string, unit: Unit) {
  const value = decimal(quantity);
  if (value.lte(0)) throw new Error("Quantity must be greater than zero");
  const definition = unitDefinitions[unit];
  const normalized = value.times(definition.factor);
  return {
    quantity: normalized.toDecimalPlaces(6).toFixed().replace(/\.0+$/, ""),
    unit: definition.baseUnit,
    dimension: definition.dimension,
  };
}

export function displayQuantity(quantity: string, baseUnit: BaseUnit): string {
  const value = new Decimal(quantity);
  if (baseUnit === "g" && value.gte(1000)) return `${value.div(1000).toDecimalPlaces(2).toString()} kg`;
  if (baseUnit === "ml" && value.gte(1000)) return `${value.div(1000).toDecimalPlaces(2).toString()} L`;
  return `${value.toDecimalPlaces(2).toString()} ${baseUnit}`;
}

export const availableUnits = Object.keys(unitDefinitions) as Unit[];
