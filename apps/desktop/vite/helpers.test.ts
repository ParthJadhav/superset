import { describe, expect, it } from "bun:test";
import { defineEnv } from "./helpers";

describe("defineEnv", () => {
	it("uses the provided value", () => {
		expect(
			defineEnv("https://example.com", "https://fallback.example.com"),
		).toBe('"https://example.com"');
	});

	it("uses the fallback when the value is undefined", () => {
		expect(defineEnv(undefined, "https://fallback.example.com")).toBe(
			'"https://fallback.example.com"',
		);
	});

	it("uses the fallback when GitHub provides an empty secret", () => {
		expect(defineEnv("", "https://fallback.example.com")).toBe(
			'"https://fallback.example.com"',
		);
	});

	it("leaves an empty optional secret undefined", () => {
		expect(defineEnv("")).toBeUndefined();
	});
});
