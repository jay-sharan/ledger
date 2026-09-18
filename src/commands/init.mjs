import {
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import {
  assertValidName,
  ensureProjectTemplates,
  fillTemplate,
  findProjectRoot,
  flagValue,
  ledgerPaths,
  readTemplate,
} from "../lib/paths.mjs";
import { tryGit } from "../lib/git.mjs";
import {
  appendEvent,
  readEvents,
  regenerateCurrent,
} from "../lib/events.mjs";

function usage() {
  console.error(
    "Usage: ledger init <name> [--title TEXT] [--branch NAME]",
  );
  process.exit(1);
}

export async function initCmd(argv) {
  const name = argv[0];
  if (!name || name.startsWith("-")) usage();
  assertValidName(name);

  const title = flagValue(argv, "--title") ?? name;
  let branch = flagValue(argv, "--branch");

  const projectRoot = findProjectRoot();
  const paths = ledgerPaths(projectRoot, name);

  if (existsSync(paths.yaml)) {
    throw new Error(`Ledger "${name}" already exists at ${paths.root}`);
  }

  if (!branch) {
    branch = tryGit(projectRoot, ["branch", "--show-current"]) ?? "main";
  }

  const shared = ensureProjectTemplates(projectRoot);

  mkdirSync(paths.events, { recursive: true });
  mkdirSync(paths.decisions, { recursive: true });

  const vars = { name, title, branch };
  writeFileSync(
    paths.yaml,
    fillTemplate(readTemplate("ledger.yaml"), vars),
    "utf8",
  );
  writeFileSync(
    paths.plan,
    fillTemplate(readTemplate("plan.md"), vars),
    "utf8",
  );
  writeFileSync(
    paths.basePrompt,
    fillTemplate(readTemplate("base-prompt.md"), vars),
    "utf8",
  );
  writeFileSync(paths.jsonl, "", "utf8");

  const at = new Date().toISOString();
  const eventId = `${at.slice(0, 19).replace(/:/g, "-")}Z-scaffold`;

  const event = {
    id: eventId,
    at,
    kind: "scaffold",
    concern: "setup",
    summary: `Scaffolded ledger ${name}`,
    pins: {
      plan: paths.planRel,
      branch,
    },
    artifacts: [
      paths.planRel,
      `.ledger/${name}/base-prompt.md`,
      ".ledger/templates/",
    ],
    next: "Author plan.md to ledger-implementation-plan/v1, then run U001 (commit before next)",
  };

  const eventPath = `${paths.events}/${eventId}.json`;
  writeFileSync(eventPath, `${JSON.stringify(event, null, 2)}\n`, "utf8");
  appendEvent(paths.jsonl, event);

  const events = readEvents(paths.jsonl);
  regenerateCurrent({
    paths,
    meta: { name, title, planRel: paths.planRel, autopilot: false },
    events,
  });

  console.log(`Created ledger "${name}" at ${paths.root}`);
  console.log(`Plan:      ${paths.planRel}`);
  console.log(`CURRENT:   .ledger/${name}/CURRENT.md`);
  console.log(`Prompt:    ledger prompt ${name}`);
  if (shared.copied.length) {
    console.log(
      `Templates: .ledger/templates/ (copied: ${shared.copied.join(", ")})`,
    );
  } else {
    console.log(
      `Templates: .ledger/templates/ (already present; not overwritten)`,
    );
  }
  console.log(
    `Author with: .ledger/templates/plan-author-prompt.md + implementation-plan.md`,
  );
  console.log(`Next:      edit the plan, then work CURRENT Next`);
}
