# Fork changelog

This file records intentional product and engineering differences between this
fork and upstream Superset. Read it before merging or rebasing upstream changes.
When a conflict changes behavior described by an **Active fork decision**, keep
the fork's outcome and adapt it to the upstream implementation unless a later
entry explicitly supersedes that decision.

## Conflict-resolution policy

1. Treat this file as the product-policy record, and the referenced commits as
   the implementation source of truth.
2. Resolve mechanical conflicts using the best current upstream structure, but
   preserve active fork behavior. Do not resolve a semantic conflict by blindly
   accepting `--ours` or `--theirs`.
3. Keep compatible upstream security fixes, bug fixes, data migrations, API
   changes, and accessibility improvements. Port the fork behavior onto those
   changes when necessary.
4. If upstream introduces a competing UX, preserve the active fork decision
   until the fork owner explicitly changes it. Record that change as a new entry
   rather than rewriting historical entries.
5. After an upstream integration, verify every preservation checklist affected
   by the merge and record the integration commit in a new entry.

## How to add an entry

Commit an implementation batch first so it has a stable hash. Then add an entry
here containing the full implementation commit hash, its parent or upstream
base, the decisions to preserve, affected areas, and verification evidence.
Commit the changelog update separately. The changelog commit itself is available
from this file's Git history; recording its own hash in its contents would be
self-referential and would change that hash.

---

## 2026-07-24 — Fork-owned desktop update feeds

- **Status:** Active fork decision
- **Implementation commit:**
  `2bf4a54e384e66d5c0a672be1b0b6db4d1cd3f01`
- **Parent commit:** `fbfa6b85426fd0bba245b3fda283af3d716c20a4`
- **Commit subject:** `fix(desktop): target fork release updates`
- **Scope:** Desktop stable and canary auto-update feeds and release packaging

### Why this fork differs

The packaged updater metadata already targeted the repository that built a
release, but the desktop main process replaced that metadata with hard-coded
upstream feed URLs. Launch verification of fork release 1.16.6 exposed that it
queried `superset-sh/superset` instead of this fork, preventing fork users from
receiving fork releases.

### Active fork decisions

- Inject the GitHub repository that built the desktop into the main-process
  bundle and derive both stable and canary update feeds from it.
- Retain `superset-sh/superset` as the fallback for local or non-GitHub builds
  that do not provide a valid `owner/repository` value.
- Verify the injected repository literal in both macOS and Linux compiled
  bundles before packaging release artifacts.

### Preservation checklist for upstream conflicts

- [ ] Fork desktop builds query their own stable release feed.
- [ ] Fork canary builds query their own `desktop-canary` release.
- [ ] Local builds without repository metadata retain the upstream fallback.
- [ ] macOS and Linux packaging fail if the build repository is absent from the
      compiled main-process bundle.

### Primary implementation areas

- `apps/desktop/src/main/lib/auto-updater.ts`
- `apps/desktop/src/main/lib/auto-updater-feed.ts`
- `apps/desktop/electron.vite.config.ts`
- `.github/workflows/build-desktop.yml`

### Verification recorded for the implementation commit

- All seven focused stable, canary, and invalid-repository feed tests passed.
- Desktop TypeScript passed, including generated icons and routes.
- Root Biome lint checked 5,379 files with zero warnings.
- A production-style compile with
  `GITHUB_REPOSITORY=ParthJadhav/superset` completed successfully, including the
  bundled CLI and PTY-daemon checks, and the compiled main process contained the
  exact fork repository literal.
- The macOS/Linux packaging assertion passed locally against that compiled
  bundle, and `git diff --check` reported no whitespace errors.

---

## 2026-07-24 — Upstream sync through Superset f1bce64af

- **Status:** Active integration record
- **Integration commit:**
  `5f45398bd582cc9915c94ad3d7c0a497677ac96e`
- **Changelog safeguard commit:**
  `b2964c5f40576492c66da1e50e691cf5d04bff1c`
- **Review follow-up commit:**
  `16176f6f8c2106d39f6c442a4b99343a78c83c6e`
- **Test stabilization commit:**
  `00fa34baad0142abb5f43a6799621b8fa17ea60a`
- **Fork parent:** `a2289b5de08e5df1256037d3a9557992ce5c92e8`
- **Upstream parent:** `f1bce64af7d2e345f0663c23b61c7f253bebd8a8`
- **Commit subject:** `chore: sync upstream main through f1bce64af`
- **Scope:** Desktop, host service, CLI, SDK, tRPC, database schema and
  migration, marketing analytics, documentation, and fork compatibility

### Integrated upstream work

- Integrated all 12 upstream commits after the common base
  `1c44157fcdc3e706b1c80309daf6b3d1c3d27104`, including fixes for Cursor
  Composer identity, V2 workspace IDE opening, capped commit totals,
  organization-scoped JWT calls, automation creation, workspace lifecycle
  telemetry, and host-targeted CLI/SDK reads.
- Preserved the upstream-generated
  `0062_drop_automations_v2_project_fk` database migration without editing or
  running it.
- Kept the upstream workspace activity chips, file-search updates, docs, and
  marketing experiment bootstrap where they do not compete with an active fork
  decision.

### Fork decisions preserved during conflicts

- Kept repository → conversation navigation and compact agent-less workspace
  fallbacks instead of restoring workspace-first navigation in the collapsed
  rail.
- Did not expose upstream's collapsed-workspace drag ordering in the chat-first
  rail; the upstream-only sortable workspace component was unreachable after
  the fork resolution and was removed during pull-request review.
- Kept New Chat, Search, and Tasks & PRs out of the V2 sidebar header.
- Kept Automations immediately to the right of Resources in expanded and
  collapsed sidebar chrome.
- Kept modifier-visible workspace shortcut badges while adopting upstream's
  keyboard-focus visibility for the row action controls.
- Extended the fork's agent-chat identity and persisted-title paths to accept
  upstream's external `cursor-composer` identity without treating it as a
  launchable built-in.

### Changelog durability

- `fork_changelog.md` is assigned Git's built-in `union` merge driver so
  simultaneous append-only fork and upstream edits retain both sides.
- CI now fails if the changelog, its conflict policy, or the merge safeguard is
  removed.

### Verification recorded for the integration commit

- All 35 monorepo typecheck tasks passed.
- Root Biome lint checked 5,377 files with zero warnings.
- All 95 focused release, upstream regression, agent-wrapper, agent-title,
  chat-navigation, CLI workspace, and changes-pane tests passed. The
  changes-pane hook suite used the desktop package preload required by its
  Electron tRPC test environment.
- The complete monorepo test command passed all 14 package tasks, including
  2,294 desktop tests and 918 host-service tests. Pull-request review also
  corrected an environment-sensitive macOS PATH test that had not accounted
  for the runtime's intentional Homebrew path augmentation.
- Pull-request review added explicit external-agent title coverage and removed
  the unreachable collapsed-workspace sortable component.
- `git diff --check` passed and upstream `f1bce64af` is an ancestor of the
  integration branch.

---

## 2026-07-23 — Accessible semantic colors for imported VS Code themes

- **Status:** Active fork decision
- **Implementation commit:**
  `461c4659f99e031b9589f8a26e00270f95749875`
- **Parent commit:** `f2b8f7c5d7d764d17f182b76dcd9800f98fcc1c5`
- **Commit subject:** `fix(desktop): normalize imported theme contrast`
- **Scope:** Desktop VS Code theme conversion, persisted custom themes, shared
  controls, and the settings sidebar

### Why this fork differs

VS Code workbench themes can use low-contrast editor chrome for secondary text
and transparent control borders paired with filled input backgrounds. Mapping
those values directly onto Superset's broader semantic roles made One Hunter
sidebar labels unreadable and Catppuccin Latte controls indistinguishable from
their surrounding surface.

### Active fork decisions

- Keep editor-only chrome colors separate from application helper and navigation
  text, and enforce a 4.5:1 minimum contrast for semantic text roles adapted
  from VS Code themes.
- Ignore effectively transparent VS Code border candidates and derive visible
  structural borders with a minimum contrast against their rendered surface.
- Preserve `settings.textInputBackground`, `input.background`, and
  `dropdown.background` as a dedicated control-surface token used by shared
  inputs, textareas, selects, toggles, checks, radios, and outline buttons.
- Normalize already-persisted VS Code themes at runtime so users receive the
  corrected mapping without reimporting them.
- Leave native Superset themes outside compatibility normalization while giving
  built-in themes explicit control-surface values.
- Use sidebar-specific foreground, selection, hover, border, and focus roles in
  the settings sidebar without applying additional opacity to section labels.

### Preservation checklist for upstream conflicts

- [ ] One Hunter-style low-contrast editor line-number colors are not reused
      directly for application helper or sidebar text.
- [ ] Catppuccin-style filled controls remain visually distinct when their
      declared VS Code borders are transparent.
- [ ] Persisted VS Code themes are normalized on activation without requiring a
      fresh import.
- [ ] Native Superset themes retain their authored semantic colors.
- [ ] Shared form controls consume the dedicated control-background token.
- [ ] Settings sidebar navigation continues to use sidebar semantic roles.

### Primary implementation areas

- `apps/desktop/src/shared/themes/vscode.ts`
- `apps/desktop/src/shared/themes/vscode-ui-colors.ts`
- `apps/desktop/src/renderer/stores/theme/`
- `apps/desktop/src/renderer/routes/_authenticated/settings/components/SettingsSidebar/`
- `packages/ui/src/components/ui/`
- `packages/ui/src/globals.css`

### Verification recorded for the implementation commit

- All 17 focused VS Code theme conversion and import tests passed.
- Desktop TypeScript passed, including generated icons and routes.
- Root Biome lint checked 5,369 files with zero warnings.
- The exact One Hunter 1.4.0 and Catppuccin 3.19.0 theme packages passed a
  converter-wide semantic contrast audit.
- A live renderer diagnostic confirmed One Hunter sidebar text and Catppuccin
  Latte control surfaces and borders used the corrected CSS variables.
- The diagnostic used a synthetic settings surface because the local
  authenticated settings journey was unavailable while its database endpoint
  was offline.

---

## 2026-07-23 — Production URL defaults for fork release builds

- **Status:** Active fork decision
- **Implementation commit:**
  `e9bd6a6fcd3a616cd0839edcefd23abd32dcf4c2`
- **Parent commit:** `e44a05a0a8e97bb4d3f51b87a01c5e97e8cebc75`
- **Commit subject:** `fix(desktop): default empty release URLs`
- **Scope:** Desktop Vite environment injection and fork release builds

### Why this fork differs

GitHub exposes unconfigured repository secrets to Actions as empty strings.
Fork release builds must remain usable without duplicating the upstream
production URL secrets because the desktop already defines safe public Superset
defaults for those endpoints.

### Active fork decisions

- Treat an empty build-time environment value the same as an absent value.
- Use each explicitly configured production fallback when an empty secret has a
  fallback.
- Leave empty optional values undefined so their runtime schemas can apply their
  own defaults.
- Cover both required URL fallbacks and optional URL defaults with focused
  tests.

### Preservation checklist for upstream conflicts

- [ ] Fork desktop releases start when URL secrets are not configured.
- [ ] Non-empty build-time values still override production defaults.
- [ ] Empty optional values remain undefined rather than being baked in as
      invalid empty strings.
- [ ] Renderer environment validation remains enabled in production.

### Primary implementation areas

- `apps/desktop/vite/helpers.ts`
- `apps/desktop/vite/helpers.test.ts`

### Verification recorded for the implementation commit

- The focused helper suite passed all four cases, including an explicitly empty
  GitHub secret and an empty optional secret.
- The desktop typecheck and root lint passed with zero warnings.
- A production compile with the API, web, Electric, and relay URL variables
  explicitly empty completed successfully and baked the expected public
  defaults into the renderer.
- The packaged arm64 app passed native-runtime validation and deep code-sign
  verification.
- After installing the corrected bundle at `/Applications/Superset.app`, a CDP
  renderer reload mounted the settings UI with three app-root children and zero
  page exceptions.

---

## 2026-07-23 — Sharp-compatible desktop runtime dependency layout

- **Status:** Active fork decision
- **Implementation commit:**
  `c14298b0f7bc34a50dc886fdf4d54d1074681744`
- **Parent commit:** `82d67f609585a58f8a1f1b4c04876b4c02b5c72c`
- **Commit subject:** `fix(desktop): align Sharp runtime dependency`
- **Scope:** Desktop production dependency layout and lockfile

### Why this fork differs

Agent-assisted project logo discovery adds Sharp to the packaged desktop
runtime. Electron Builder traverses the Bun dependency tree directly and needs
Sharp's required `detect-libc` version to be resolvable from the desktop
package's production dependency layout on every build platform.

### Active fork decisions

- Keep the desktop's direct `detect-libc` dependency aligned with Sharp's
  supported 2.1.x runtime.
- Allow packages that require an older exact version, such as libsql, to retain
  their isolated nested copy.
- Verify this layout through the Linux Electron packaging path, not only macOS
  application builds.

### Preservation checklist for upstream conflicts

- [ ] Electron Builder can traverse Sharp's production dependencies on Linux
      without a missing `detect-libc` error.
- [ ] Sharp and libsql each resolve a compatible `detect-libc` version in the
      packaged application.
- [ ] The native-runtime validator still finds the target Sharp binding and
      libvips packages.

### Primary implementation areas

- `apps/desktop/package.json`
- `bun.lock`

### Verification recorded for the implementation commit

- A clean frozen install resolved the desktop's direct `detect-libc` dependency
  to 2.1.2 while retaining libsql's nested 2.0.2 copy.
- The desktop typecheck and root lint passed with zero warnings.
- A cross-platform production build on macOS targeted Linux, passed native
  runtime validation, traversed the complete dependency graph, and produced
  the Linux AppImage without the CI failure.

---

## 2026-07-23 — Cross-platform Sharp packaging for the standalone CLI

- **Status:** Active fork decision
- **Implementation commit:**
  `17d7a7b64647511421f1b5b7159489a3fb8d23d4`
- **Parent commit:** `5d9e50238687f7ffe5ada07e831a0d36d97a3ef6`
- **Commit subject:** `fix(cli): package Sharp runtime dependencies`
- **Scope:** Standalone CLI distribution assembly and native-addon smoke testing

### Why this fork differs

Agent-assisted project logo discovery makes Sharp part of the host-service
runtime graph. The standalone CLI ships that host service with a private Node
runtime, so its distribution must include Sharp's JavaScript package and the
native binding and libvips packages for every supported target.

### Active fork decisions

- Copy `sharp` and its regular runtime dependencies into standalone CLI
  distributions.
- Explicitly include the matching `@img/sharp-*` and
  `@img/sharp-libvips-*` optional packages for darwin-arm64, darwin-x64,
  linux-x64, and linux-arm64.
- Probe `require("sharp")` from outside the repository during CLI smoke tests so
  the distribution cannot pass by resolving a workspace copy.
- Keep the full host-service boot check after individual native-addon probes.

### Preservation checklist for upstream conflicts

- [ ] Every CLI target maps to its matching Sharp binding and libvips package.
- [ ] Sharp resolves from the packaged `lib/node_modules` tree.
- [ ] Standalone host-service startup succeeds without access to repository
      dependencies.

### Primary implementation areas

- `packages/cli/scripts/build-dist.ts`
- `packages/cli/scripts/smoke-test.sh`

### Verification recorded for the implementation commit

- GitHub CI reproduced the missing runtime on both linux-x64 and linux-arm64:
  the distributions built, then their host services failed at startup because
  Sharp could not load.
- The updated darwin-arm64 distribution built successfully and its isolated
  smoke test loaded better-sqlite3, node-pty, Parcel Watcher, libsql, and Sharp.
- The smoke test also spawned a real PTY and booted the packaged host service to
  a healthy listening state.
- CLI TypeScript and root lint passed with zero warnings.

---

## 2026-07-23 — Agent-assisted project logo discovery

- **Status:** Active fork decision
- **Implementation commit:**
  `fb8996ef1f95dd269ddd4bb94802ac20cd5e7aed`
- **Parent commit:** `606b7b170ddf9e6c93a9fd831d7c09f4d67c5f86`
- **Commit subject:** `feat(desktop): derive project logos with agents`
- **Scope:** Desktop project settings, host-service agent execution, local
  project metadata, and packaged native image dependencies

### Why this fork differs

Projects should be able to derive a recognizable icon from assets already in
their repositories without requiring users to locate, resize, and upload the
asset manually.

### Active fork decisions

- Let users select a compatible configured agent in Project Settings and ask it
  to find the repository's primary logo.
- Keep the agent boundary read-only: the agent returns only a project-relative
  candidate path and never supplies persisted image bytes.
- Resolve and validate the real path inside the repository, reject traversal
  and escaping symlinks, enforce source-size and pixel limits, then normalize
  supported images to a 128×128 PNG.
- Store the normalized image as a self-contained data URL on the local-first
  project row and propagate changes through host project events.
- Prefer a derived project icon over GitHub-avatar fallbacks everywhere project
  thumbnails appear, while preserving fallback behavior for mixed-version hosts
  and projects without derived icons.
- Allow users to replace or remove the derived logo and remember the selected
  compatible agent per host.
- Keep Sharp external to the main bundle and package and validate its
  architecture-specific runtime dependencies.

### Preservation checklist for upstream conflicts

- [ ] Agent output cannot select a file outside the repository or bypass image
      decoding and size limits.
- [ ] Project-logo updates propagate to settings, sidebars, filters, recent
      projects, and workspace dialogs without hiding cached project rows.
- [ ] Removing a derived logo restores the existing fallback icon.
- [ ] The packaged desktop app includes and can load Sharp for its target
      architecture.

### Primary implementation areas

- `packages/host-service/src/projects/project-logo.ts`
- `packages/host-service/src/agents/headless-agent.ts`
- `packages/host-service/src/trpc/router/project/project.ts`
- `apps/desktop/src/renderer/routes/_authenticated/settings/v2-project/$projectId/components/V2ProjectSettings/components/ProjectLogoField/`
- `apps/desktop/scripts/copy-native-modules.ts`
- `apps/desktop/scripts/validate-native-runtime.ts`

### Verification recorded for the implementation commit

- The combined feature suite passed all 74 tests.
- The host-service suite passed all 917 executed tests.
- All 35 monorepo typecheck tasks passed and root lint passed with zero
  warnings.
- The production desktop build passed native-runtime validation, including
  packaged arm64 Sharp binaries, and the built app passed deep code-signature
  verification.
- Installed-app testing used `/Applications/Superset.app`, its file renderer,
  CDP port 19377, and real pointer input.
- Claude found `BloomIconFinal.icon/Assets/Subtract.svg`, the host normalized it
  to a PNG data URL, all visible Bloom thumbnails updated, and the result
  persisted across settings navigation and remount.
- Removing the test logo restored all Bloom thumbnails to the GitHub fallback.

---

## 2026-07-23 — Modifier-visible workspace and tab shortcuts

- **Status:** Active fork decision
- **Implementation commit:**
  `2f307f947ccd9f1d616feb62be3d21fb0ec1e0f5`
- **Parent commit:** `fb8996ef1f95dd269ddd4bb94802ac20cd5e7aed`
- **Commit subject:** `feat(desktop): show workspace shortcut hints`
- **Scope:** Desktop workspace navigation, hotkey registry, modifier tracking,
  and pane tab presentation

### Why this fork differs

Number-based navigation is fast only when users can discover the number assigned
to each workspace and tab without memorizing hidden ordering rules.

### Active fork decisions

- Show numbered badges for the first nine workspaces while Command is held on
  macOS, and while Control-Shift is held on other platforms.
- Show numbered badges for the first nine tabs while Option is held on macOS,
  and use the platform-equivalent tab modifier elsewhere.
- Bind Option-1 through Option-9 to direct tab selection on macOS.
- Remove badges immediately on modifier release, window blur, or document
  visibility loss so modifier state cannot become stuck.
- Keep labels stable while the underlying workspace order is unchanged and
  temporarily replace tab accessories with the shortcut badge for clarity.

### Preservation checklist for upstream conflicts

- [ ] Shortcut labels match the same flattened ordering used by the number
      hotkeys.
- [ ] Collapsed projects and sections reveal the selected workspace.
- [ ] Modifier badges disappear on release, blur, and visibility loss.
- [ ] Tabs beyond the ninth never receive an ambiguous number badge.

### Primary implementation areas

- `apps/desktop/src/renderer/hooks/useModifierKeys/`
- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/`
- `apps/desktop/src/renderer/hotkeys/registry.ts`
- `packages/panes/src/react/components/Workspace/`

### Verification recorded for the implementation commit

- The combined feature suite passed all 74 tests, including the hotkey registry
  coverage for macOS Option-number tab switching.
- All 35 monorepo typecheck tasks passed and root lint passed with zero
  warnings.
- Installed-app testing on CDP port 19377 showed workspace badges only while
  Command was held and a tab badge only while Option was held; both badge sets
  disappeared on modifier release.
- Before/after screenshots were captured from the installed production build.

---

## 2026-07-23 — Close terminal panes when their shell exits

- **Status:** Active fork decision
- **Implementation commit:**
  `66af2cec1f6773c9bb68366a66c8c30f2bb3392d`
- **Parent commit:** `2f307f947ccd9f1d616feb62be3d21fb0ec1e0f5`
- **Commit subject:** `fix(desktop): close terminal panes on shell exit`
- **Scope:** Desktop terminal WebSocket transport, runtime registry, and pane
  lifecycle

### Why this fork differs

A terminal whose shell has exited is no longer an interactive pane. Leaving the
dead terminal open forces users to close it manually and creates a misleading
workspace state.

### Active fork decisions

- Deliver server PTY exit details through the terminal transport after flushing
  pending output.
- Scope exit listeners to a terminal pane instance and remove them during
  teardown so stale runtimes cannot close replacement panes.
- Close the owning terminal through the normal pane lifecycle when its shell
  exits, including removing the tab when it contained the final pane.

### Preservation checklist for upstream conflicts

- [ ] Pending terminal output is flushed before exit listeners run.
- [ ] Only the pane instance attached to the exiting runtime closes.
- [ ] Listener cleanup prevents late exit events from affecting replacement
      panes.
- [ ] Terminal exit uses normal pane-store removal and tab fallback behavior.

### Primary implementation areas

- `apps/desktop/src/renderer/lib/terminal/terminal-ws-transport.ts`
- `apps/desktop/src/renderer/lib/terminal/terminal-runtime-registry.ts`
- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/$workspaceId/hooks/usePaneRegistry/components/TerminalPane/TerminalPane.tsx`

### Verification recorded for the implementation commit

- The combined feature suite passed all 74 tests, including transport delivery,
  pane-instance scoping, and cleanup coverage.
- The desktop suite passed 2,281 tests; its only failure was the pre-existing
  Codex shell-PATH assertion caused by the process environment prepending
  `/opt/homebrew/sbin:/usr/local/sbin`.
- All 35 monorepo typecheck tasks passed and root lint passed with zero
  warnings.
- In the installed production app, a terminal was opened with real pointer
  input and `exit` was typed into its xterm input. The xterm count and tab count
  both changed from one to zero, returning the workspace to its empty state.

---

## 2026-07-23 — VS Code theme compatibility and Open VSX discovery

- **Status:** Active fork decision
- **Implementation commit:**
  `0cf245fdefc514aedad99894bcdb1c9d7205e515`
- **Parent commit:** `66af2cec1f6773c9bb68366a66c8c30f2bb3392d`
- **Commit subject:** `feat(desktop): support VS Code themes`
- **Scope:** Desktop theme parsing, persistence, main-process Open VSX access,
  and Appearance settings

### Why this fork differs

Superset should consume the established VS Code color-theme ecosystem instead
of requiring users and theme authors to maintain a separate Superset-only
format.

### Active fork decisions

- Accept VS Code JSON and JSONC themes directly while retaining backward
  compatibility with existing Superset theme files.
- Map VS Code workbench, terminal, TextMate, and semantic-token colors onto
  Superset's UI, editor, diff, and terminal surfaces.
- Search the vendor-neutral Open VSX registry from Appearance settings and
  install only declared theme assets from downloaded VSIX archives.
- Support theme packs, theme `include` files, JSON token colors, and `.tmTheme`
  property lists.
- Never install or execute extension code.
- Enforce trusted Open VSX origins, request timeouts, download and decompression
  limits, safe archive paths, and sanitized color values.
- Apply the first imported variant immediately and retain additional variants in
  the user's custom theme list.

### Preservation checklist for upstream conflicts

- [ ] Legacy Superset themes remain importable.
- [ ] VS Code JSONC, semantic tokens, TextMate scopes, editor colors, and
      terminal colors continue to map deterministically.
- [ ] VSIX extraction reads only declared theme assets and cannot traverse
      archive or include paths.
- [ ] Marketplace installs never execute extension code.
- [ ] Imported theme variants persist and remain selectable in Appearance.

### Primary implementation areas

- `apps/desktop/src/shared/themes/vscode.ts`
- `apps/desktop/src/shared/themes/import.ts`
- `apps/desktop/src/lib/trpc/routers/theme-marketplace/`
- `apps/desktop/src/renderer/routes/_authenticated/settings/appearance/components/AppearanceSettings/components/ThemeSection/`

### Verification recorded for the implementation commit

- The combined feature suite passed all 74 tests, including VS Code conversion,
  JSONC import, safe VSIX extraction, and theme marketplace coverage.
- All 35 monorepo typecheck tasks passed and root lint passed with zero
  warnings.
- The production desktop build completed and the installed app passed deep
  code-signature verification.
- Installed-app testing on CDP port 19377 opened Appearance, searched Open VSX
  for One Dark Pro, applied the verified result, and observed the active palette
  change from background/foreground `#151110`/`#eae8e6` to
  `#282c34`/`#abb2bf`.
- The app reported four additional variants installed. The prior active Dark
  theme was restored after verification.

---

## 2026-07-23 — Persisted agent-session resumption

- **Status:** Active fork decision
- **Implementation commit:**
  `5e2fc0628d7d40eb495ce8e95f3f07fb047ddb9e`
- **Parent commit:** `c23a8b4bc6cbfd738ab2a1a028784a9f74c9fed2`
- **Commit subject:** `fix(desktop): resume persisted agent sessions`
- **Scope:** Desktop agent-chat navigation and host-service terminal-agent
  lifecycle

### Why this fork differs

Persisted agent conversations should remain usable after the desktop app or its
host service has stopped. Opening a restored conversation must resume the
agent-native session by its stored session ID rather than merely reopening its
terminal at an idle shell prompt.

### Active fork decisions

- Store and use the agent-native session ID associated with each terminal-agent
  binding.
- Before navigating from an agent-chat sidebar row, ask the owning host to
  resume the session when its terminal is idle.
- Re-adopt or recreate the persisted terminal session before checking its
  foreground process so resumption works across app and host-service restarts.
- Resume Claude with `--resume <session-id>` and Codex with
  `resume <session-id>`, preserving configured executable paths, arguments, and
  environment overlays.
- Do not infer resume syntax for unsupported or custom agents.
- Keep active sessions untouched and coalesce concurrent resume requests so
  repeated clicks cannot launch duplicate agents.
- Navigation remains available when resumption is unavailable or fails; the
  error is logged and the persisted terminal still opens.

### Preservation checklist for upstream conflicts

- [ ] Clicking an idle restored Claude or Codex conversation resumes its stored
      agent-native session before focusing the terminal.
- [ ] Clicking a currently running conversation does not launch a duplicate
      agent process.
- [ ] Resume commands retain configured agent arguments and safely shell-quote
      session IDs.
- [ ] Unsupported agents and missing session IDs fail safely without blocking
      navigation.
- [ ] App or host-service restart boundaries retain the same terminal and
      agent-session identities.

### Primary implementation areas

- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/components/DashboardSidebarAgentChatItem/`
- `packages/host-service/src/trpc/router/agents/agents.ts`
- `packages/host-service/src/trpc/router/terminal-agents/terminal-agents.ts`

### Verification recorded for the implementation commit

- All 46 focused terminal-agent, command-building, sidebar grouping, and
  navigation tests passed.
- Desktop and host-service TypeScript checks passed.
- Root lint passed with zero warnings.
- `git diff --check` passed.
- Exact-worktree end-to-end testing used the development Electron renderer at
  `http://localhost:3005`, CDP port 9335, and real pointer/keyboard input.
- A persisted Claude session from a prior app lifecycle changed from no
  foreground process to a running agent, returned `status: "resumed"`, and
  rendered its prior conversation instead of an idle shell.
- Repeating the sidebar click returned `status: "already-running"` and kept the
  same terminal ID without launching a duplicate process.
- Before/after screenshots are retained under
  `test-results/session-resumption/` in the local verification workspace.

---

## 2026-07-23 — Prompt-first Command-N workflow

- **Status:** Active fork decision
- **Implementation commit:**
  `e85921ef69c9eb94c7fd6d47451f91f3034d9408`
- **Parent commit:** `7160fd0429291913b7fa3be50b1eb86064f051cd`
- **Commit subject:** `feat(desktop): send prompts without new workspaces`
- **Scope:** Desktop Command-N composer, Markdown editor keyboard handling, and
  main-workspace agent launch

### Why this fork differs

Command-N is primarily a prompt launcher, not a worktree-creation command.
Sending a routine prompt should reuse the selected project's existing main
workspace. Creating a branch and worktree is an explicit secondary action
because it carries additional repository and navigation consequences.

### Active fork decisions

- Plain Enter sends the prompt to the selected project's existing main
  workspace without creating a branch or worktree.
- The composer arrow button follows the same direct-send path as plain Enter.
- Command-Enter on macOS and Control-Enter on other platforms sends while
  creating a new workspace.
- Shift-Enter remains the multiline newline shortcut.
- The composer footer labels both actions: `↵ Send` and
  `⌘↵ New workspace` (or the platform-equivalent modifier).
- Direct sends preserve the selected agent, model, effort, attachments, linked
  pull request, and linked issues, then navigate to the launched session.

### Verification recorded for the implementation commit

- All four focused Markdown-editor keyboard tests passed, covering Enter,
  Shift-Enter, modified Enter, and IME composition.
- The desktop TypeScript check passed.
- Root lint passed with zero warnings.
- The development renderer for this worktree was confirmed at
  `http://localhost:3005/#/sign-in` on CDP port 9335. Authenticated end-to-end
  verification was blocked because that exact development instance was signed
  out; no different app instance was substituted.
- The implementation passed `git diff --check`.

---

## 2026-07-23 — Credential-free unit-test environment

- **Status:** Active fork decision
- **Implementation commit:**
  `309aad6e1c7037cf4581b982f4722f86146a835c`
- **Parent commit:** `e1f940518b55e9850afdc5151d6882a8142a44ab`
- **Commit subject:** `fix(ci): provide test database placeholders`
- **Scope:** GitHub Actions unit-test job

### Why this fork differs

The fork does not expose an upstream Neon connection string to pull-request
checks. The unit tests mock database operations, but importing `@superset/db`
still constructs a Neon client and requires a syntactically valid URL.

### Active fork decisions

- Give the unit-test job local, non-routable PostgreSQL placeholder URLs.
- Do not require production or preview database credentials to execute mocked
  unit tests.

### Verification recorded for the implementation commit

- The affected TRPC router tests passed with the placeholder URLs.
- Root lint passed with zero warnings.
- The workflow change passed `git diff --check`.

---

## 2026-07-23 — Credential-free macOS release packaging

- **Status:** Active fork decision
- **Implementation commit:**
  `0fcb46d1ed0eb80602d6dd7921ce922fe92993e1`
- **Parent commit:** `1c84b4a502470246938d787555276a96d0be8c15`
- **Commit subject:** `fix(ci): omit empty macOS signing inputs`
- **Scope:** Reusable desktop release workflow

### Why this fork differs

Electron Builder interprets an explicitly empty `CSC_LINK` as a local path and
fails instead of producing an unsigned package. A fork without Apple signing
secrets must omit signing inputs entirely.

### Active fork decisions

- Select separate signed and unsigned macOS packaging steps based on whether
  `MAC_CERTIFICATE` is configured.
- Never expose an empty `CSC_LINK` to Electron Builder.
- Disable certificate auto-discovery explicitly for unsigned builds.

### Verification recorded for the implementation commit

- Root lint passed with zero warnings.
- The workflow change passed `git diff --check`.
- The preceding release run reproduced the failure on both macOS architectures
  while Linux packaging and artifact upload passed.

---

## 2026-07-23 — GitHub Releases first distribution

- **Status:** Active fork decision
- **Implementation commit:**
  `a3d98ac121209370627e1249ddf0ae8a41fa0eb7`
- **Parent commit:** `6269497ad0618fb54707c1da59d3be1ca00bfea9`
- **Commit subject:** `ci: prioritize GitHub release distribution`
- **Scope:** Desktop packaging, release workflows, production deployment, and
  release documentation

### Why this fork differs

This fork can publish artifacts through GitHub but does not have access to the
upstream production database, Vercel, Cloudflare, Homebrew tap, or Apple signing
credentials. Those integrations must not prevent GitHub-hosted desktop and CLI
releases.

### Active fork decisions

- Treat GitHub Releases in the current repository as the primary desktop and
  CLI distribution channel.
- Derive desktop updater ownership from `GITHUB_REPOSITORY` instead of hardcoding
  the upstream repository.
- Build unsigned macOS release artifacts when Apple credentials are absent, and
  sign/notarize automatically when credentials are configured.
- Run production server deploys automatically only when
  `PRODUCTION_DEPLOYMENTS_ENABLED=true`; preserve manual dispatch as an explicit
  override.
- Update the external Homebrew tap only when
  `HOMEBREW_PUBLISHING_ENABLED=true`.

### Verification recorded for the implementation commit

- Root lint passed with zero warnings.
- All 35 monorepo typecheck tasks passed.
- All 15 release-script tests passed.
- The Electron builder config resolved its GitHub provider to
  `ParthJadhav/superset` and disabled notarization without Apple credentials.
- Workflow and documentation changes passed `git diff --check`.

---

## 2026-07-22 — Opt-in preview deployments

- **Status:** Active fork decision
- **Implementation commit:**
  `dbe97b47038b6794d0b878c35f2ec2b51f01a51b`
- **Parent commit:** `df46f903eab67c6831f3d2d9e6e4d460e110fa14`
- **Commit subject:** `ci: gate unconfigured preview deployments`
- **Scope:** GitHub Actions preview deployment workflow

### Why this fork differs

This fork does not have Neon or Vercel preview credentials configured. Preview
deployment jobs should not fail every pull request merely because that optional
infrastructure is unavailable.

### Active fork decisions

- Run preview deployment jobs only when the repository variable
  `PREVIEW_DEPLOYMENTS_ENABLED` is set to `true`.
- Keep regular pull-request CI independent from optional preview infrastructure.

### Verification recorded for the implementation commit

- Root lint passed with zero warnings.
- The workflow change passed `git diff --check`.
- GitHub-hosted PR checks verified that unconfigured preview jobs skip cleanly.

---

## 2026-07-22 — Manually runnable CI

- **Status:** Active fork decision
- **Implementation commit:**
  `30a6584f545dd78e309dba0722030c12c6322c73`
- **Parent commit:** `8e55cac014289784cdbd9e1e83827d2c46053ca8`
- **Commit subject:** `ci: allow manual CI runs`
- **Scope:** GitHub Actions CI workflow

### Why this fork differs

The CI workflow should be runnable on demand so its setup can be verified even
when no new push or pull-request event is available.

### Active fork decisions

- Preserve the `workflow_dispatch` trigger alongside push and pull-request
  triggers in `.github/workflows/ci.yml`.

### Verification recorded for the implementation commit

- Root lint passed with zero warnings.
- The workflow change passed `git diff --check`.
- GitHub-hosted CI verification is recorded on the pull request for this change.

---

## 2026-07-22 — Agent-chat-first desktop navigation

- **Status:** Active fork decision
- **Implementation commit:**
  `603ae51f5ff0ed7a28ed01af6120134859c405f4`
- **Parent commit:** `1c44157fcdc3e706b1c80309daf6b3d1c3d27104`
- **Commit subject:** `feat(desktop): make agent chats primary navigation`
- **Scope:** Desktop renderer, host-service agent metadata, and pane layout state

### Why this fork differs

The desktop app should treat an agent conversation as the primary unit of work.
A repository is stable context, while a workspace is metadata describing where
the conversation runs. Repeating repository, workspace, agent, preset, and pane
identity in separate navigation rows makes active work harder to scan.

### Active fork decisions

#### Repository navigation is chat-first

- Repositories are the top-level sidebar groups.
- Active Codex and Claude conversations render directly under their repository;
  workspaces do not form a second navigation level for those conversations.
- Each conversation row retains its workspace name as secondary context and
  exposes its agent icon and lifecycle status.
- Multiple agents in one workspace remain separate conversation rows.
- Selecting a conversation navigates to its workspace and focuses its exact
  terminal session.
- Pending and agent-less workspaces remain reachable as compact fallbacks. Do
  not restore workspace-first hierarchy to support those cases.

#### Chats can be pinned

- Pinning is keyed by terminal session, stored locally, and available from chat
  actions, context menus, and the pin hotkey.
- Pinned conversations appear in a global **Pinned** section and sort first
  within their repository while still remaining visible in repository context.
- Preserve immediate pin/unpin updates and persistence across renderer remounts.

#### Agent titles own the editor identity

- Prefer the agent's persisted session title for the conversation and tab.
  Codex titles are read from its state database and Claude titles from its
  session JSONL, both read-only with normalized fallbacks.
- The top tab carries the concise conversation title, agent icon, and status.
- Generic labels such as `Codex`, `Claude`, and `Terminal` must not displace an
  available conversation or workspace title.
- The presets/Manage Presets row is intentionally absent from the workspace
  surface.
- A single-terminal tab suppresses the redundant pane-title strip. Split tabs
  retain pane headers and controls for orientation and manipulation.

#### Sidebar chrome stays minimal

- The Setup Scripts promotion is permanently removed from both legacy and v2
  sidebars, together with its dismissal state.
- **Tasks & PRs** is removed from both sidebar variants.
- **New Chat** and **Search** are removed from the v2 sidebar header.
- **Automations** is a compact chrome action immediately to the right of
  **Resources**. This order remains intact when the sidebar is expanded,
  collapsed, or closed.

#### Simplified chrome must preserve direct terminal access

- Empty interactive agent launches are valid and must not require a prompt.
- `Cmd/Ctrl+J` opens or focuses one full-width bottom terminal panel; it does not
  keep adding duplicate panels.
- Chat-input focus moves to the shifted shortcut, and pin/unpin has a dedicated
  shortcut.
- Pane state supports edge insertion and records bottom-panel placement so the
  terminal workflow survives the removed toolbar layers.

### Preservation checklist for upstream conflicts

- [ ] Repository → conversation hierarchy remains intact.
- [ ] Workspace names remain metadata on chat rows, not parent navigation rows.
- [ ] Pin state, global pinned section, and repository-local pin ordering work.
- [ ] Chat rows still focus the exact terminal session.
- [ ] Persisted Codex/Claude session titles remain the preferred tab labels.
- [ ] The presets row and redundant single-pane title strip remain absent.
- [ ] Setup Scripts, Tasks & PRs, New Chat, and Search remain absent from the
      specified sidebar surfaces.
- [ ] Automations remains immediately right of Resources in every sidebar state.
- [ ] Pending/agent-less workspaces and split-pane controls remain reachable.
- [ ] Bottom terminal-panel and pin hotkeys remain functional and non-duplicating.

### Primary implementation areas

- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/DashboardSidebar/`
- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/components/TopBar/`
- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/`
- `apps/desktop/src/renderer/lib/agent-chat-title.ts`
- `apps/desktop/src/renderer/stores/agent-chat-pins.ts`
- `packages/host-service/src/terminal-agents/session-title.ts`
- `packages/host-service/src/trpc/router/terminal-agents/terminal-agents.ts`
- `packages/panes/src/core/store/store.ts`
- `packages/panes/src/react/components/Workspace/`

### Verification recorded for the implementation commit

- Root lint passed with zero warnings.
- All 35 monorepo typecheck tasks passed.
- Eleven focused title, grouping, and pane-store tests passed.
- The desktop suite passed 2,252 tests; one pre-existing environment-sensitive
  shell `PATH` assertion in `git.test.ts` remained unrelated to this change.
- Exact-worktree UI checks used renderer `http://localhost:19344` and CDP port
  `19345`, with real pointer/keyboard input, route assertions, reload/remount,
  expanded/collapsed sidebar checks, and screenshots.
- A packaged production build completed, passed deep code-signature validation,
  and launched with its bundled host and terminal services.

---

## 2026-07-22 — Keyboard-first terminal and harness navigation

- **Status:** Active fork decision
- **Implementation commit:**
  `e8fc016e698cf9c79c9bfb2b0815920fcdd142da`
- **Parent commit:** `0ef6d2be6a1626bd0c60e181cba49af046cc1e91`
- **Commit subject:**
  `feat(desktop): add keyboard-first terminal and harness navigation`
- **Scope:** Desktop hotkeys, workspace tab picker, pane title resolution, and
  shared panes package

### Why this fork differs

Terminal access and new agent tabs are primary navigation actions. They should
be available from stable, memorable shortcuts without competing legacy
bindings, and opening a bottom utility panel must not replace the identity of
the conversation tab above it.

### Active fork decisions

#### `Cmd+J` exclusively controls the bottom terminal

- On macOS, `Cmd+J` opens or focuses the bottom terminal panel by default.
- Remove the previous default `Cmd+J` assignment from chat-input focus; that
  action remains customizable but has no competing default binding.
- Repeated terminal shortcut presses focus the existing bottom panel instead of
  adding duplicates.

#### Bottom utility panes do not rename top tabs

- A terminal or browser opened as the bottom panel cannot drive the enclosing
  top tab's title or icon.
- Focusing the bottom terminal must preserve the conversation or workspace
  identity already shown in the top tab.
- Regular panes outside the bottom-panel role retain their existing title
  resolution behavior.

#### `Cmd+T` opens the harness picker

- On macOS, `Cmd+T` opens the same controlled harness picker as the tab-bar add
  button. Windows and Linux use `Ctrl+Shift+T` to avoid their native new-tab
  convention.
- The old default new-group binding is removed, while the action remains
  available for custom keybinding.
- While the picker is open, number keys `1` through `4` immediately create a
  tab for the corresponding visible harness.
- A pencil action enters edit mode so users can hide harnesses from the picker,
  restore hidden harnesses, and persist that preference locally.

### Preservation checklist for upstream conflicts

- [ ] `Cmd+J` opens or focuses exactly one bottom terminal panel.
- [ ] Chat-input focus does not reclaim the default `Cmd+J` binding.
- [ ] Focusing a bottom terminal or browser leaves the top tab title and icon
      unchanged.
- [ ] `Cmd+T` opens the harness picker on macOS.
- [ ] Number keys `1` through `4` launch the matching visible harness.
- [ ] The pencil edit mode can hide and restore harnesses, with local
      persistence.
- [ ] Custom bindings remain possible for chat-input focus and new-group
      actions.

### Primary implementation areas

- `apps/desktop/src/renderer/hotkeys/`
- `apps/desktop/src/renderer/routes/_authenticated/_dashboard/v2-workspace/`
- `packages/panes/src/react/components/Workspace/`
- `packages/panes/src/react/types.ts`

### Verification recorded for the implementation commit

- Root lint passed with zero warnings.
- Desktop and panes package typechecks passed.
- Twenty-one focused hotkey, harness-picker, and pane-title tests passed.
- The production desktop compile completed, including bundled CLI and PTY
  daemon checks.
- The production Electron preview launched from the exact worktree build, loaded
  its renderer successfully, and adopted the existing PTY daemon sessions.
