import { expect, test } from "@playwright/test";
import { lbToKg, kgToLb, miToKm } from "../../src/lib/types";

test.describe("Unit Conversion Utilities", () => {
  test.describe("lbToKg", () => {
    test("converts positive values correctly", () => {
      expect(lbToKg(150)).toBe(68);
      expect(lbToKg(1)).toBe(0.5);
      expect(lbToKg(100)).toBe(45.4);
      expect(lbToKg(0.5)).toBe(0.2);
    });

    test("handles zero correctly", () => {
      expect(lbToKg(0)).toBe(0);
    });

    test("handles negative values", () => {
      expect(lbToKg(-150)).toBe(-68);
      expect(lbToKg(-1)).toBe(-0.5);
    });
  });

  test.describe("kgToLb", () => {
    test("converts positive values correctly", () => {
      expect(kgToLb(68)).toBe(149.9);
      expect(kgToLb(1)).toBe(2.2);
      expect(kgToLb(100)).toBe(220.5);
      expect(kgToLb(0.5)).toBe(1.1);
    });

    test("handles zero correctly", () => {
      expect(kgToLb(0)).toBe(0);
    });

    test("handles negative values", () => {
      expect(kgToLb(-68)).toBe(-149.9);
      expect(kgToLb(-1)).toBe(-2.2);
    });
  });

  test.describe("miToKm", () => {
    test("converts positive values correctly", () => {
      expect(miToKm(26.2)).toBe(42.2);
      expect(miToKm(1)).toBe(1.6);
      expect(miToKm(100)).toBe(160.9);
      expect(miToKm(0.5)).toBe(0.8);
    });

    test("handles zero correctly", () => {
      expect(miToKm(0)).toBe(0);
    });

    test("handles negative values", () => {
      expect(miToKm(-26.2)).toBe(-42.2);
      expect(miToKm(-1)).toBe(-1.6);
    });
  });

  test.describe("round-trip approximations", () => {
    test("lb -> kg -> lb should be reasonably close to original", () => {
      const originalLb = 150;
      const kg = lbToKg(originalLb);
      const returnedLb = kgToLb(kg);

      // Because we round to 1 decimal place at each step, precision is lost.
      // 150 lb = 68.038... kg -> 68.0 kg
      // 68.0 kg = 149.914... lb -> 149.9 lb
      // 150 - 149.9 = 0.1 delta
      expect(Math.abs(originalLb - returnedLb)).toBeLessThanOrEqual(0.2);
    });

    test("kg -> lb -> kg should be reasonably close to original", () => {
      const originalKg = 80;
      const lb = kgToLb(originalKg); // 80 * 2.20462 = 176.3696 -> 176.4
      const returnedKg = lbToKg(lb); // 176.4 * 0.453592 = 80.0136... -> 80.0

      expect(Math.abs(originalKg - returnedKg)).toBeLessThanOrEqual(0.2);
    });
  });
});
