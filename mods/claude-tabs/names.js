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
// - The title is cleaned like the old hook: whitespace collapsed, Claude's
//   status glyph (spinner/✳) stripped, cut at MAX characters.

import { spaces, panes, shared, setShared, run } from "herdr";

const KEY = "claude-tabs.owned"; // tab id -> the name this mod gave it
const MAX = 60;
const DEFAULT_TITLES = new Set(["Claude Code", "Claude"]);

// Renames sent but not yet visible in spaces(); avoids re-sending on every render.
const inflight = new Map();

export function cleanTitle(raw) {
  const t = String(raw ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();
  if (!t || DEFAULT_TITLES.has(t)) return "";
  const chars = [...t];
  return chars.length > MAX ? chars.slice(0, MAX).join("") + "…" : t;
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
    const title = cleanTitle(p.title);
    if (!title || tab.name === title) { inflight.delete(id); continue; }
    if (inflight.get(id) === title) continue;
    inflight.set(id, title);
    run("tab.rename", { id, name: title });
    next[id] = title;
  }

  // Forget tabs that are gone; keep ones whose Claude pane exited, so the name
  // stays ours if Claude starts again there.
  for (const [id, name] of Object.entries(owned)) if (tabs.has(id) && !(id in next)) next[id] = name;
  for (const id of inflight.keys()) if (!tabs.has(id)) inflight.delete(id);
  if (JSON.stringify(next) !== JSON.stringify(owned)) setShared(KEY, next);
}
