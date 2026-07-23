import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
	extractLogoCandidatePath,
	normalizeLogoCandidate,
	normalizeProjectLogo,
	resolveContainedLogoPath,
} from "./project-logo";

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), prefix));
	tempDirs.push(dir);
	return dir;
}

afterEach(async () => {
	await Promise.all(
		tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
	);
});

describe("extractLogoCandidatePath", () => {
	test("uses the last valid JSON object after CLI banner output", () => {
		expect(
			extractLogoCandidatePath(
				'Hook loaded {"status":"ok"}\n```json\n{"path":"public/logo.svg"}\n```',
			),
		).toBe("public/logo.svg");
	});

	test("returns null for an explicit no-match response", () => {
		expect(extractLogoCandidatePath('{"path":null}')).toBeNull();
	});

	test("rejects malformed or empty selections", () => {
		expect(() => extractLogoCandidatePath("not json")).toThrow(
			"The agent did not return a valid logo selection.",
		);
		expect(() => extractLogoCandidatePath('{"path":""}')).toThrow(
			"The agent did not return a valid logo selection.",
		);
	});
});

describe("resolveContainedLogoPath", () => {
	test("accepts a real file inside the repository", async () => {
		const repo = await createTempDir("project-logo-repo-");
		await mkdir(join(repo, "public"));
		await writeFile(join(repo, "public", "logo.png"), "image");

		await expect(
			resolveContainedLogoPath(repo, "public/logo.png"),
		).resolves.toMatchObject({ relativePath: "public/logo.png" });
	});

	test("rejects parent traversal and absolute paths", async () => {
		const parent = await createTempDir("project-logo-parent-");
		const repo = join(parent, "repo");
		await mkdir(repo);
		await writeFile(join(parent, "secret.png"), "secret");

		await expect(
			resolveContainedLogoPath(repo, "../secret.png"),
		).rejects.toMatchObject({ code: "unsafe_path" });
		await expect(
			resolveContainedLogoPath(repo, join(parent, "secret.png")),
		).rejects.toMatchObject({ code: "unsafe_path" });
	});

	test("rejects a symlink that escapes the repository", async () => {
		const parent = await createTempDir("project-logo-symlink-");
		const repo = join(parent, "repo");
		await mkdir(repo);
		const outside = join(parent, "outside.png");
		await writeFile(outside, "secret");
		await symlink(outside, join(repo, "logo.png"));

		await expect(
			resolveContainedLogoPath(repo, "logo.png"),
		).rejects.toMatchObject({ code: "unsafe_path" });
	});

	test("rejects oversized source files before decoding", async () => {
		const repo = await createTempDir("project-logo-large-");
		await writeFile(join(repo, "logo.png"), Buffer.alloc(5 * 1024 * 1024 + 1));

		await expect(
			resolveContainedLogoPath(repo, "logo.png"),
		).rejects.toMatchObject({ code: "file_too_large" });
	});
});

describe("normalizeProjectLogo", () => {
	test("decodes and normalizes a supported image to PNG", async () => {
		const repo = await createTempDir("project-logo-image-");
		const imagePath = join(repo, "logo.webp");
		await sharp({
			create: {
				width: 320,
				height: 160,
				channels: 4,
				background: { r: 20, g: 80, b: 160, alpha: 1 },
			},
		})
			.webp()
			.toFile(imagePath);

		const result = await normalizeProjectLogo(imagePath);
		expect(result).toStartWith("data:image/png;base64,");

		const bytes = Buffer.from(result.split(",")[1] ?? "", "base64");
		const metadata = await sharp(bytes).metadata();
		expect(metadata.format).toBe("png");
		expect(metadata.width).toBe(128);
		expect(metadata.height).toBe(128);
	});

	test("rejects invalid image bytes and pixel bombs", async () => {
		const repo = await createTempDir("project-logo-invalid-");
		const invalidPath = join(repo, "logo.png");
		await writeFile(invalidPath, "not an image");
		await expect(normalizeProjectLogo(invalidPath)).rejects.toMatchObject({
			code: "invalid_image",
		});

		const hugeSvgPath = join(repo, "huge.svg");
		await writeFile(
			hugeSvgPath,
			'<svg xmlns="http://www.w3.org/2000/svg" width="100000" height="100000"><rect width="100%" height="100%"/></svg>',
		);
		await expect(normalizeProjectLogo(hugeSvgPath)).rejects.toMatchObject({
			code: "invalid_image",
		});
	});
});

describe("normalizeLogoCandidate", () => {
	test("returns no_match without touching the filesystem", async () => {
		await expect(
			normalizeLogoCandidate({
				repoPath: "/path/that/does/not/exist",
				agentOutput: '{"path":null}',
			}),
		).resolves.toEqual({ status: "no_match" });
	});

	test("validates and applies an agent-selected relative path", async () => {
		const repo = await createTempDir("project-logo-candidate-");
		await mkdir(join(repo, "assets"));
		await sharp({
			create: {
				width: 64,
				height: 64,
				channels: 4,
				background: { r: 255, g: 0, b: 120, alpha: 1 },
			},
		})
			.png()
			.toFile(join(repo, "assets", "mark.png"));

		const result = await normalizeLogoCandidate({
			repoPath: repo,
			agentOutput: '{"path":"assets/mark.png"}',
		});
		expect(result).toMatchObject({
			status: "found",
			sourcePath: "assets/mark.png",
		});
		if (result.status !== "found") throw new Error("Expected a logo");
		expect(result.iconDataUrl).toStartWith("data:image/png;base64,");
	});
});
