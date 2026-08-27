import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTimeString,
  isTimeOverlapping,
  normalizeDateString,
  formatTime12h,
} from "../../src/utils/timeUtils.js";

describe("timeUtils", () => {
  describe("timeToMinutes", () => {
    it("should parse standard HH:mm strings correctly", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("09:00")).toBe(540);
      expect(timeToMinutes("10:30")).toBe(630);
      expect(timeToMinutes("23:59")).toBe(1439);
    });

    it("should parse HH:mm:ss strings correctly", () => {
      expect(timeToMinutes("09:00:00")).toBe(540);
      expect(timeToMinutes("14:45:30")).toBe(885);
    });

    it("should throw error on invalid string formats", () => {
      expect(() => timeToMinutes("invalid")).toThrow();
      expect(() => timeToMinutes("25:00")).toThrow();
      expect(() => timeToMinutes("12:65")).toThrow();
    });
  });

  describe("minutesToTimeString", () => {
    it("should convert minutes to HH:mm string", () => {
      expect(minutesToTimeString(0)).toBe("00:00");
      expect(minutesToTimeString(540)).toBe("09:00");
      expect(minutesToTimeString(630)).toBe("10:30");
      expect(minutesToTimeString(1439)).toBe("23:59");
    });
  });

  describe("isTimeOverlapping - Mathematical 8 Boundary Permutations", () => {
    // Reference base interval: [09:00, 10:30]
    const baseStart = "09:00";
    const baseEnd = "10:30";

    it("1. Identical intervals should overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "09:00", "10:30")).toBe(true);
    });

    it("2. Subset/Inner interval should overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "09:15", "10:00")).toBe(true);
    });

    it("3. Superset/Outer interval should overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "08:30", "11:00")).toBe(true);
    });

    it("4. Partial left overlap (starts before, ends inside) should overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "08:00", "09:30")).toBe(true);
    });

    it("5. Partial right overlap (starts inside, ends after) should overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "10:00", "11:30")).toBe(true);
    });

    it("6. Abutting end (Back-to-back: endA == startB) should NOT overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "10:30", "12:00")).toBe(false);
    });

    it("7. Abutting start (StartA == endB) should NOT overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "07:30", "09:00")).toBe(false);
    });

    it("8. Completely disjoint intervals (before / after) should NOT overlap", () => {
      expect(isTimeOverlapping(baseStart, baseEnd, "07:00", "08:30")).toBe(false);
      expect(isTimeOverlapping(baseStart, baseEnd, "11:00", "12:30")).toBe(false);
    });

    it("should throw error if interval start is not strictly before end", () => {
      expect(() => isTimeOverlapping("10:00", "09:00", "11:00", "12:00")).toThrow();
      expect(() => isTimeOverlapping("09:00", "10:00", "12:00", "11:00")).toThrow();
      expect(() => isTimeOverlapping("09:00", "09:00", "11:00", "12:00")).toThrow();
    });
  });

  describe("normalizeDateString and formatTime12h", () => {
    it("should normalize dates to YYYY-MM-DD", () => {
      expect(normalizeDateString("2026-08-27")).toBe("2026-08-27");
      expect(normalizeDateString("2026-08-27T10:00:00.000Z")).toBe("2026-08-27");
    });

    it("should format time to 12-hour format with AM/PM", () => {
      expect(formatTime12h("09:00")).toBe("9:00 AM");
      expect(formatTime12h("12:00")).toBe("12:00 PM");
      expect(formatTime12h("13:30")).toBe("1:30 PM");
      expect(formatTime12h("00:15")).toBe("12:15 AM");
    });
  });
});
