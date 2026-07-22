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
