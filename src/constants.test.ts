import { describe, expect, it } from "bun:test";
import { formatPrice, formatSessionLength } from "./constants";

describe("formatPrice", () => {
  it("formats cents to dollars", () => {
    expect(formatPrice(700)).toBe("$7.00");
    expect(formatPrice(49300)).toBe("$493.00");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0.00");
  });

  it("formats undefined as ?", () => {
    expect(formatPrice(undefined)).toBe("?");
  });

  it("formats null as ?", () => {
    expect(formatPrice(null as unknown as undefined)).toBe("?");
  });

  it("keeps two decimals", () => {
    expect(formatPrice(105)).toBe("$1.05");
    expect(formatPrice(10)).toBe("$0.10");
  });
});

describe("formatSessionLength", () => {
  it("converts 15-min units to minutes", () => {
    expect(formatSessionLength(2)).toBe("30min");
    expect(formatSessionLength(3)).toBe("45min");
    expect(formatSessionLength(4)).toBe("60min");
    expect(formatSessionLength(6)).toBe("90min");
  });

  it("formats undefined as ?", () => {
    expect(formatSessionLength(undefined)).toBe("?");
  });

  it("formats null as ?", () => {
    expect(formatSessionLength(null as unknown as undefined)).toBe("?");
  });

  it("formats zero", () => {
    expect(formatSessionLength(0)).toBe("0min");
  });
});
