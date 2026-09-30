export function helpCmd() {
  console.log(`ledger — personal multi-feature progress ledger

Usage:
  ledger <command> [args]

Commands:
  init <name> [--title TEXT] [--branch NAME]
      Create .ledger/<name>/ with plan, CURRENT, events, decisions, base prompt.
      Also seeds .ledger/templates/ once per project (does not overwrite).

  list [-g|--global] [--up N] [--json]
      List ledgers in this project (name, current unit, next unit, title).
      Shows Done when Next names no unit.
      With -g, go N levels above the project root (default 1) and list
      ledgers in every git repo found up to N levels below it.
      With --json, print rows with absolute file paths (for agents).

  status [name]
      Show metadata + Next. With no name, list all ledgers briefly.

  prompt <name> [--no-copy]
      Print the base prompt (filled from CURRENT metadata). Copies to clipboard
      on macOS unless --no-copy.

  checkpoint <name> --file <event.json>
  checkpoint <name> --stdin
  checkpoint <name> --regen
      Append a progress event (unless --regen) and regenerate CURRENT.md.

  assert <name> [--match-pin]
      Fail if the git working tree is dirty. With --match-pin, also require
      HEAD to contain the ledger home pins.commit value (ledger-host repo only).
      Subject/package commits in contexts are informational — not asserted.

  autopilot <name> [on|off]
      Show or set autopilot for a ledger. When on, agents continue the plan,
      checkpoint without waiting, take recommended decisions (documented),
      and end with a short summary.

  version | -v | --version
      Print the installed CLI version.

  help
      Show this message.

Project root:
  Walks up from cwd until it finds .git or .ledger.

Event kinds:
  scaffold | approve | run | counterexample | converge | decision_link | note

Local install (until published):
  cd /path/to/ledger && npm link
  # or: alias ledger="node /path/to/ledger/bin/ledger.mjs"

Global install (npm):
  npm install -g @j1514/ledger

See README.md for workflow and handoff formats.
`);
}
