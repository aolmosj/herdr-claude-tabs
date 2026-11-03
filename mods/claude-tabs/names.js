// Keeps each tab's name in sync with the title Claude Code sets for its
// conversation (the terminal title), like herdr-tab-name.sh did for the herdr TUI.
//
// Rules:
// - Only tabs with a Claude Code pane are touched. If a tab has several, the
//   focused one wins, else the first.
// - A tab is ours to rename when nobody named it, when it still has the agent's
//   default name ("Claude Code", from the + menu), or when its name is the one
//   we set last time. Rename it yourself and it is left alone; clear the name
//   (rename to "") to hand it back.
// - The title is cleaned like the old hook: whitespace collapsed and Claude's
//   status glyph (spinner/✳) stripped. It is stored in full; the tab bar cuts
//   it visually.
// - Claude's placeholder titles are skipped: "Claude Code" and, until Claude
//   picks a topic, the name of the folder it runs in.
// - syncTabNames() runs on every render (Herdr re-renders on live data changes)
//   and from a 5 s fallback timer in main.js; both are idempotent.

import { spaces, panes, shared, setShared, run } from "herdr";

const KEY = "claude-tabs.owned"; // tab id -> the name this mod gave it
const DEFAULT_TITLES = new Set(["Claude Code", "Claude"]);
const RETRY_MS = 5000;

// Renames sent but not yet visible in spaces(): tab id -> { name, at }. Avoids
// re-sending on every render; expires so a rename that failed is retried.
const inflight = new Map();

function folderName(cwd) {
  return String(cwd ?? "").split(/[\\/]/).filter(Boolean).pop() ?? "";
}

export function cleanTitle(raw, cwd) {
  const t = String(raw ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
  if (!t || DEFAULT_TITLES.has(t) || t === folderName(cwd)) return "";
  return t;
}

function claudePaneByTab() {
  const byTab = new Map();
  for (const p of panes()) {
    if (!p.terminal || p.app !== "claude-code") continue;
    const cur = byTab.get(p.tab);
    if (!cur || (p.focused && !cur.focused)) byTab.set(p.tab, p);
  }
  return byTab;
}

export function syncTabNames() {
  const owned = shared(KEY) ?? {};
  const next = {};
  const tabs = new Map(spaces().flatMap(s => s.tabs).map(t => [t.id, t]));

  for (const [id, p] of claudePaneByTab()) {
    const tab = tabs.get(id);
    if (!tab) continue;
    const mine = !tab.named || tab.name === owned[id] || tab.name === p.program?.name || DEFAULT_TITLES.has(tab.name);
    if (!mine) continue; // renamed by hand: leave it
    if (owned[id] !== undefined) next[id] = owned[id];
    const title = cleanTitle(p.title, p.cwd);
    if (!title || tab.name === title) { inflight.delete(id); continue; }
    const sent = inflight.get(id);
    if (sent && sent.name === title && Date.now() - sent.at < RETRY_MS) continue;
    inflight.set(id, { name: title, at: Date.now() });
    run("tab.rename", { id, name: title });
    next[id] = title;
  }

  // Forget tabs that are gone; keep ones whose Claude pane exited, so the name
  // stays ours if Claude starts again there.
  for (const [id, name] of Object.entries(owned)) if (tabs.has(id) && !(id in next)) next[id] = name;
  for (const id of inflight.keys()) if (!tabs.has(id)) inflight.delete(id);
  if (JSON.stringify(next) !== JSON.stringify(owned)) setShared(KEY, next);
}
