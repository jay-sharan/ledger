import { existsSync, readdirSync } from "node:fs";
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
  return {
    name,
    title: cfg.title ?? name,
    current,
    next: next ?? "",
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

function printTable(rows, withRepo) {
  const columns = [
    ...(withRepo ? [["REPO", "repo"]] : []),
    ["NAME", "name"],
    ["CURRENT", "current"],
    ["NEXT", "next"],
  ];
  const widths = columns.map(([header, key]) =>
    Math.max(header.length, ...rows.map((r) => r[key].length)),
  );
  const line = (cells, title) =>
    `${cells.map((c, i) => c.padEnd(widths[i])).join("  ")}  ${title}`;

  console.log(line(columns.map(([h]) => h), "TITLE"));
  for (const row of rows) {
    console.log(line(columns.map(([, k]) => row[k]), row.title));
  }
}

export async function listCmd(argv = []) {
  const json = hasFlag(argv, "--json");
  if (hasFlag(argv, "-g") || hasFlag(argv, "--global")) {
    const up = parseUp(argv);
    let start;
    try {
      start = findProjectRoot();
    } catch {
      start = process.cwd();
    }
    let scanRoot = resolve(start);
    for (let i = 0; i < up; i++) scanRoot = dirname(scanRoot);

    const repos = findLedgerRepos(scanRoot, up);
    const rows = repos.flatMap((repo) =>
      listLedgers(repo).map((name) => ({
        repo: relative(scanRoot, repo) || ".",
        repoPath: repo,
        ...ledgerRow(repo, name),
      })),
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
  if (json) {
    const rows = names.map((name) => ({
      repoPath: projectRoot,
      ...ledgerRow(projectRoot, name),
    }));
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (names.length === 0) {
    console.log("No ledgers yet. Run: ledger init <name>");
    return;
  }
  printTable(
    names.map((name) => ledgerRow(projectRoot, name)),
    false,
  );
}
