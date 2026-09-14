import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PACKAGE_ROOT = resolve(__dirname, "../..");
export const SCHEMA_PATH = join(
  PACKAGE_ROOT,
  "schema",
  "progress-event.schema.json",
);
export const TEMPLATES_DIR = join(PACKAGE_ROOT, "templates");

const NAME_RE = /^[a-z0-9][a-z0-9_-]*$/i;

export function assertValidName(name) {
  if (!name || !NAME_RE.test(name)) {
    throw new Error(
      `Invalid ledger name "${name ?? ""}". Use letters, numbers, hyphens, underscores.`,
    );
  }
}

/** Walk up from cwd to find a directory that contains .git or .ledger */
export function findProjectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, ".git")) || existsSync(join(dir, ".ledger"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "Could not find project root (no .git or .ledger above cwd). Run from inside a project.",
      );
    }
    dir = parent;
  }
}

export function ledgerRoot(projectRoot, name) {
  return join(projectRoot, ".ledger", name);
}

export function ledgerPaths(projectRoot, name) {
  const root = ledgerRoot(projectRoot, name);
  return {
    root,
    yaml: join(root, "ledger.yaml"),
    plan: join(root, "plan.md"),
    current: join(root, "CURRENT.md"),
    jsonl: join(root, "progress.jsonl"),
    events: join(root, "events"),
    decisions: join(root, "decisions"),
    basePrompt: join(root, "base-prompt.md"),
    planRel: `.ledger/${name}/plan.md`,
  };
}

export function listLedgers(projectRoot) {
  const base = join(projectRoot, ".ledger");
  if (!existsSync(base)) return [];
  return readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => existsSync(join(base, name, "ledger.yaml")))
    .sort();
}

export function requireLedger(projectRoot, name) {
  assertValidName(name);
  const paths = ledgerPaths(projectRoot, name);
  if (!existsSync(paths.yaml)) {
    throw new Error(
      `Ledger "${name}" not found at ${paths.root}. Run: ledger init ${name}`,
    );
  }
  return paths;
}

/** Minimal YAML reader for our flat key: value config */
export function readLedgerYaml(yamlPath) {
  const raw = readFileSync(yamlPath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (value === "true") value = true;
    else if (value === "false") value = false;
    out[m[1]] = value;
  }
  return out;
}

export function readTemplate(name) {
  return readFileSync(join(TEMPLATES_DIR, name), "utf8");
}

export function fillTemplate(text, vars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : "",
  );
}

export function flagValue(argv, name) {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = argv[idx + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

export function hasFlag(argv, name) {
  return argv.includes(name);
}
