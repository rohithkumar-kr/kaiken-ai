import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("filters out falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
