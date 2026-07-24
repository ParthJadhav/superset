const DEFAULT_UPDATE_REPOSITORY = "superset-sh/superset";
const GITHUB_REPOSITORY_PATTERN =
	/^[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?\/[A-Za-z0-9](?:[A-Za-z0-9_.-]*[A-Za-z0-9])?$/;

function normalizeUpdateRepository(repository: string | undefined): string {
	const candidate = repository?.trim();
	if (!candidate || !GITHUB_REPOSITORY_PATTERN.test(candidate)) {
		return DEFAULT_UPDATE_REPOSITORY;
	}
	return candidate;
}

export function getUpdateFeedUrl(
	repository: string | undefined,
	isPrerelease: boolean,
): string {
	const releasePath = isPrerelease
		? "releases/download/desktop-canary"
		: "releases/latest/download";
	return `https://github.com/${normalizeUpdateRepository(repository)}/${releasePath}`;
}
