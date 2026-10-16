import { describe, expect, it } from "vitest";
import { reorderSplitsSchema } from "./split.js";

const A = "2b1f0c8e-6a4d-4c43-9b0e-8f1a2c3d4e5f";
const B = "7c9e2a41-0d3b-4f6a-8e5c-1b2d3e4f5a6b";

describe("reorderSplitsSchema", () => {
  it("aceita ids distintos", () => {
    expect(reorderSplitsSchema.safeParse({ order: [A, B] }).success).toBe(true);
  });

  it("recusa id repetido", () => {
    expect(reorderSplitsSchema.safeParse({ order: [A, A] }).success).toBe(false);
  });
});
