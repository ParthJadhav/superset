# Agent chat navigation redesign

## Outcome

Make active agent conversations the primary navigation object in the desktop app. Repositories remain the stable top-level grouping, but workspaces become context shown on each chat rather than a second navigation level.

## Research findings

- `DashboardSidebar` currently renders `repository -> optional section -> workspace` from host-owned project/workspace identity plus local sidebar placement.
- Live terminal-agent identity and status already come from `terminalAgents.listByWorkspace`; the sidebar currently hides this first-class data in small activity badges below a workspace row.
- Each agent binding has a stable terminal id, agent id, timestamps, and lifecycle status. Existing navigation can focus that exact session through the workspace route's `terminalId` and `focusRequestId` search values.
- Persisted pane layouts already map terminal ids to tab and pane titles. Workspace names are AI-generated from the initiating task in the normal creation flow and provide a useful thread-summary fallback when a tab has only a generic agent label.
- The v2 editor currently stacks three horizontal identity layers: the pane tab bar, the optional presets bar (including Manage Presets), and the per-pane terminal header. The tab bar can carry thread title, agent icon, status, and the existing actions without repeating the agent name below it.
- Agent icons, lifecycle status derivation, notification indicators, open/kill behavior, and repository grouping all already exist and should be reused.

## Goals

1. Render active agent chats directly below their repository.
2. Show each chat's concise thread title, agent icon, lifecycle status, and workspace name.
3. Navigate a chat row to the exact workspace and terminal session.
4. Allow any active agent chat to be pinned or unpinned; pinned chats appear in a global section at the top and sort first inside their repository, with the preference persisted locally.
5. Keep pending or agent-less workspaces reachable through a compact fallback without restoring workspace-first hierarchy.
6. Make the editor tab the single identity surface for an agent chat:
   - use the summarized thread/workspace title instead of generic `Codex`, `Claude`, or `Terminal` labels;
   - preserve the agent icon and live status in the tab;
   - remove the preset-management row from the workspace surface;
   - suppress the redundant terminal title row when the terminal is the only pane in a tab, while preserving controls and multi-pane orientation where needed.
7. Preserve existing close, kill, notification, project collapse, repository ordering, remote-host, pending-create, and empty-state behavior.

## Interaction decisions

- Pin is available from a hover action and the chat context menu. A global Pinned section puts selected chats at the top, while the same chats remain in their repository so context is never lost.
- Chat order within a repository is pinned first, then most recently active/started. Agent-less workspace fallbacks follow active chats.
- The workspace name is secondary metadata on the chat row. The primary label comes from an explicit tab/pane title when it is descriptive; generic agent/shell titles fall back to the workspace's generated name.
- A single-pane agent tab has no second pane-title strip. Split tabs retain pane headers because they are required to orient and manipulate individual panes.

## Acceptance criteria

- [x] Repository groups contain agent-chat rows instead of workspace rows when agents exist.
- [x] Multiple agents in one workspace appear as separate rows.
- [x] Clicking a row focuses the exact agent terminal.
- [x] Pin/unpin persists across remounts, updates the global Pinned section, and changes repository-local ordering immediately.
- [x] Every agent row exposes title, workspace, agent icon, and state accessibly.
- [x] Workspaces without a current agent remain reachable.
- [x] Generic agent titles are replaced by a concise thread summary in the top tab.
- [x] Manage Presets and the presets row are absent from the workspace content surface.
- [x] The redundant single-terminal pane title row is absent; split-pane headers still work.
- [x] Focused unit/component tests, lint, and typecheck pass.
- [x] The real desktop journey is verified before and after with the correct worktree, renderer port, authenticated session, screenshots, and state observations.

## Verification journeys

1. Open a repository with two agent sessions in different workspaces; confirm direct chat rows and workspace subtitles.
2. Pin the lower chat; confirm it moves first, survives a route/remount, and can be unpinned.
3. Open each chat; confirm the URL targets its workspace and terminal and the correct pane receives focus.
4. Confirm the top tab shows a summarized title plus the correct agent icon/status, with no presets row or duplicate single-pane agent title row.
5. Create or inspect an agent-less/pending workspace and confirm it remains reachable.
6. Open a split tab and confirm pane headers and pane controls remain usable.

## Verification record

- Verified on 2026-07-22 in the modified worktree at `/Users/parthjadhav/Development/superset`, renderer `http://localhost:19344`, CDP port `19345`, and the authenticated isolated profile `superset-agent-chat-navigation`.
- Used the supplied screenshots as the baseline and captured post-change screenshots for the unpinned sidebar, pinned sidebar, simplified single-pane editor, and split-pane editor.
- Used real pointer input to pin, open, and unpin a chat. The pinned terminal id persisted through a full renderer reload and was removed again after unpinning.
- Confirmed chat navigation produced the expected workspace route and exact `terminalId` search value.
- Used real keyboard input to split the terminal and confirmed pane headers returned only for the multi-pane layout.
- Final checks: root lint passed with zero warnings, all 35 monorepo typecheck tasks passed, and 11 focused tests passed. The broader desktop suite passed 2,252 tests with one unrelated environment-sensitive shell-PATH assertion failure in `git.test.ts`.
