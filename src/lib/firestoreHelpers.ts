import { Timestamp } from "firebase/firestore";
import type { EpochMillis } from "../types";

export function tsToMillis(value: unknown): EpochMillis {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return Date.now();
}
