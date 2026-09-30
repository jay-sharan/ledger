import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  findProjectRoot,
  flagValue,
  hasFlag,
  listLedgers,
  readLedgerYaml,
  requireLedger,
} from "../lib/paths.mjs";
import { nextUnit, readEvents } from "../lib/events.mjs";

function ledgerRow(projectRoot, name) {
  const paths = requireLedger(projectRoot, name);
  const cfg = readLedgerYaml(paths.yaml);
  const events = readEvents(paths.jsonl);
  const next = nextUnit(events);
  const current = next ? (events[events.length - 1]?.concern ?? "—") : "Done";
  const lastAt = Date.parse(events[events.length - 1]?.at ?? "");
  const updated = new Date(
    Number.isNaN(lastAt) ? statSync(paths.yaml).mtimeMs : lastAt,
  ).toISOString();
  return {
    name,
    title: cfg.title ?? name,
    current,
    next: next ?? "",
    updated,
    paths: {
      root: paths.root,
      plan: paths.plan,
      current: paths.current,
      decisions: paths.decisions,
      progress: paths.jsonl,
    },
  };
}

/** Find git repos with ledgers under `dir`, descending at most `depth` levels. */
function findLedgerRepos(dir, depth) {
  if (existsSync(join(dir, ".git"))) {
    return listLedgers(dir).length > 0 ? [dir] : [];
  }
  if (depth <= 0) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter(
      (d) =>
        d.isDirectory() &&
        !d.name.startsWith(".") &&
        d.name !== "node_modules",
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((d) => findLedgerRepos(join(dir, d.name), depth - 1));
}

function parseUp(argv) {
  const raw = flagValue(argv, "--up");
  if (raw === undefined) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`--up must be a positive integer (got "${raw}")`);
  }
  return n;
}

function sortRows(rows) {
  return rows.sort(
    (a, b) =>
      (a.next ? 0 : 1) - (b.next ? 0 : 1) ||
      b.updated.localeCompare(a.updated) ||
      a.name.localeCompare(b.name),
  );
}

function timeAgo(iso, now = Date.now()) {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  const units = [
    ["y", 31536000],
    ["mo", 2592000],
    ["w", 604800],
    ["d", 86400],
    ["h", 3600],
    ["m", 60],
  ];
  const [label, size] = units.find(([, size]) => s >= size);
  return `${Math.floor(s / size)}${label} ago`;
}

function truncate(text, max) {
  if (max <= 1 || text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function printTable(rows, withRepo) {
  const color = process.stdout.isTTY && !process.env.NO_COLOR;
  const dim = (s) => (color ? `\x1b[2m${s}\x1b[0m` : s);
  const view = rows.map((r) => ({ ...r, ago: timeAgo(r.updated) }));

  const columns = [
    ...(withRepo ? [["REPO", "repo"]] : []),
    ["NAME", "name"],
    ["CURRENT", "current"],
    ["NEXT", "next"],
    ["UPDATED", "ago"],
  ];
  const widths = columns.map(([header, key]) =>
    Math.max(header.length, ...view.map((r) => r[key].length)),
  );
  const prefixWidth = widths.reduce((sum, w) => sum + w + 2, 0);
  const termWidth = process.stdout.isTTY ? process.stdout.columns : 0;
  const titleMax = termWidth ? termWidth - prefixWidth : Infinity;
  const line = (cells, title) =>
    `${cells.map((c, i) => c.padEnd(widths[i])).join("  ")}  ${truncate(title, titleMax)}`;

  console.log(line(columns.map(([h]) => h), "TITLE"));
  for (const row of view) {
    const text = line(columns.map(([, k]) => row[k]), row.title);
    console.log(row.next ? text : dim(text));
  }

  const active = rows.filter((r) => r.next).length;
  const total = rows.length;
  console.log(
    dim(
      `\n${total} ledger${total === 1 ? "" : "s"} · ${active} active · ${total - active} done`,
    ),
  );
}

export async function listCmd(argv = []) {
  const json = hasFlag(argv, "--json");
  if (hasFlag(argv, "-g") || hasFlag(argv, "--global")) {
    const up = parseUp(argv);
    let scanRoot;
    try {
      scanRoot = findProjectRoot();
      for (let i = 0; i < up; i++) scanRoot = dirname(scanRoot);
    } catch {
      // Outside any repo: treat cwd as the workspace folder itself.
      scanRoot = resolve(process.cwd());
    }

    const repos = findLedgerRepos(scanRoot, up);
    const rows = sortRows(
      repos.flatMap((repo) =>
        listLedgers(repo).map((name) => ({
          repo: relative(scanRoot, repo) || ".",
          repoPath: repo,
          ...ledgerRow(repo, name),
        })),
      ),
    );
    if (json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    if (rows.length === 0) {
      console.log(`No ledgers found under ${scanRoot}`);
      return;
    }
    printTable(rows, true);
    return;
  }

  const projectRoot = findProjectRoot();
  const names = listLedgers(projectRoot);
  const rows = sortRows(
    names.map((name) => ({
      repoPath: projectRoot,
      ...ledgerRow(projectRoot, name),
    })),
  );
  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (rows.length === 0) {
    console.log("No ledgers yet. Run: ledger init <name>");
    return;
  }
  printTable(rows, false);
}
