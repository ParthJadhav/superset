import { useEffect, useState } from "react";

export interface ModifierKeys {
	alt: boolean;
	ctrl: boolean;
	meta: boolean;
	shift: boolean;
}

const NO_MODIFIERS: ModifierKeys = {
	alt: false,
	ctrl: false,
	meta: false,
	shift: false,
};

function modifierKeysFromEvent(event: KeyboardEvent): ModifierKeys {
	return {
		alt: event.altKey,
		ctrl: event.ctrlKey,
		meta: event.metaKey,
		shift: event.shiftKey,
	};
}

function haveSameModifiers(left: ModifierKeys, right: ModifierKeys): boolean {
	return (
		left.alt === right.alt &&
		left.ctrl === right.ctrl &&
		left.meta === right.meta &&
		left.shift === right.shift
	);
}

/**
 * Tracks the modifier keys currently held while the renderer has focus.
 *
 * Window blur and document hiding explicitly clear the snapshot so shortcut
 * affordances cannot remain visible after macOS consumes a key-up event.
 */
export function useModifierKeys(): ModifierKeys {
	const [modifiers, setModifiers] = useState(NO_MODIFIERS);

	useEffect(() => {
		const updateModifiers = (event: KeyboardEvent) => {
			const next = modifierKeysFromEvent(event);
			setModifiers((current) =>
				haveSameModifiers(current, next) ? current : next,
			);
		};
		const clearModifiers = () => setModifiers(NO_MODIFIERS);
		const handleVisibilityChange = () => {
			if (document.visibilityState === "hidden") clearModifiers();
		};

		window.addEventListener("keydown", updateModifiers, true);
		window.addEventListener("keyup", updateModifiers, true);
		window.addEventListener("blur", clearModifiers);
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			window.removeEventListener("keydown", updateModifiers, true);
			window.removeEventListener("keyup", updateModifiers, true);
			window.removeEventListener("blur", clearModifiers);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, []);

	return modifiers;
}
