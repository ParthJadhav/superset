import { describe, expect, test } from "bun:test";
import { shouldSubmitMarkdownEditorOnEnter } from "./shouldSubmitMarkdownEditorOnEnter";

function keyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
	return {
		key: "Enter",
		keyCode: 13,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		isComposing: false,
		...overrides,
	} as KeyboardEvent;
}

describe("shouldSubmitMarkdownEditorOnEnter", () => {
	test("submits on plain Enter", () => {
		expect(shouldSubmitMarkdownEditorOnEnter(keyboardEvent())).toBe(true);
	});

	test("keeps Shift+Enter for a newline", () => {
		expect(
			shouldSubmitMarkdownEditorOnEnter(keyboardEvent({ shiftKey: true })),
		).toBe(false);
	});

	test("leaves modified Enter to the create-workspace shortcut", () => {
		expect(
			shouldSubmitMarkdownEditorOnEnter(keyboardEvent({ metaKey: true })),
		).toBe(false);
		expect(
			shouldSubmitMarkdownEditorOnEnter(keyboardEvent({ ctrlKey: true })),
		).toBe(false);
	});

	test("does not submit while an IME composition is active", () => {
		expect(
			shouldSubmitMarkdownEditorOnEnter(keyboardEvent({ isComposing: true })),
		).toBe(false);
		expect(
			shouldSubmitMarkdownEditorOnEnter(keyboardEvent({ keyCode: 229 })),
		).toBe(false);
	});
});
