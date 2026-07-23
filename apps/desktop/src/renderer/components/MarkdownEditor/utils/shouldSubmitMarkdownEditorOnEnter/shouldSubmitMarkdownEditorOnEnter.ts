import { isEnterSubmit } from "@superset/ui/lib/keyboard";

export function shouldSubmitMarkdownEditorOnEnter(
	event: KeyboardEvent,
): boolean {
	if (event.metaKey || event.ctrlKey) return false;
	return isEnterSubmit(event);
}
