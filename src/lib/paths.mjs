import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
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

export function projectTemplatesDir(projectRoot) {
  return join(projectRoot, ".ledger", "templates");
}

/**
 * Copy package templates into `.ledger/templates/` once per project.
 * Never overwrites existing files so local edits stick.
 * @returns {{ dir: string, copied: string[], skipped: string[] }}
 */
export function ensureProjectTemplates(projectRoot) {
  const destDir = projectTemplatesDir(projectRoot);
  mkdirSync(destDir, { recursive: true });
  const copied = [];
  const skipped = [];
  for (const name of readdirSync(TEMPLATES_DIR)) {
    const src = join(TEMPLATES_DIR, name);
    if (!statSync(src).isFile()) continue;
    const dest = join(destDir, name);
    if (existsSync(dest)) {
      skipped.push(name);
      continue;
    }
    copyFileSync(src, dest);
    copied.push(name);
  }
  return { dir: destDir, copied, skipped };
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
    .filter((name) => name !== "templates")
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

/**
 * Set a top-level scalar in ledger.yaml (preserves other lines/comments).
 * Appends the key when missing.
 */
export function setLedgerYamlValue(yamlPath, key, value) {
  if (!/^[A-Za-z0-9_]+$/.test(key)) {
    throw new Error(`Invalid yaml key: ${key}`);
  }
  const rendered =
    typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  let raw = existsSync(yamlPath) ? readFileSync(yamlPath, "utf8") : "";
  const re = new RegExp(`^${key}:\\s*.*$`, "m");
  if (re.test(raw)) {
    raw = raw.replace(re, `${key}: ${rendered}`);
  } else {
    raw = `${raw.trimEnd()}${raw.trimEnd() ? "\n" : ""}${key}: ${rendered}\n`;
  }
  if (!raw.endsWith("\n")) raw += "\n";
  writeFileSync(yamlPath, raw, "utf8");
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
