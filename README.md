# ledger

Personal progress ledger for big features. Not part of your product apps.

One repo can have many ledgers (one per feature). Each ledger owns its plan, snapshot, events, and decisions. Progress is append-only and machine-checked; AI instructions are only a thin bootstrap.

## Install (local)

```bash
cd /path/to/ledger
npm link          # puts `ledger` on your PATH
# or without link:
alias ledger="node /path/to/ledger/bin/ledger.mjs"
```

Requires Node 20+.

## Quick start

From inside a git project:

```bash
ledger init app-scan --title "App-scan" --branch app-scan/v1
# edit .ledger/app-scan/plan.md
ledger prompt app-scan          # paste into a new AI chat
# …do the unit CURRENT Next names…
ledger assert app-scan --match-pin
# after commit, write an event JSON, then:
ledger checkpoint app-scan --file .ledger/app-scan/events/my-event.json
```

## Layout

```
.ledger/
  <name>/
    ledger.yaml       # name, title, autoCheckpoint
    plan.md           # execution plan for this feature
    base-prompt.md    # text for `ledger prompt`
    CURRENT.md        # regenerated snapshot (metadata + status)
    progress.jsonl    # append-only event log
    events/           # event JSON files
    decisions/        # dated decision notes
```

`CURRENT.md` has:

- **Metadata** — ledger name, plan path, home pins (branch, commit, …)
- **Contexts** — named pin groups (apps/experiments/packages) + **Active**
- **Status** — last event, **Next**, recent history

## Commands

| Command | What it does |
| --- | --- |
| `ledger init <name> [--title T] [--branch B]` | Create a new feature ledger |
| `ledger list` | List ledgers in this project |
| `ledger status [name]` | Show Next / home pins / contexts / active |
| `ledger prompt <name> [--no-copy]` | Print base prompt (copies on macOS) |
| `ledger checkpoint <name> --file <event.json>` | Append event + regen CURRENT |
| `ledger checkpoint <name> --stdin` | Same, from stdin |
| `ledger checkpoint <name> --regen` | Regen CURRENT only |
| `ledger assert <name> [--match-pin]` | Clean tree; home `pins.commit` only |
| `ledger help` | Help text |

Project root: walks up from cwd until it finds `.git` or `.ledger`.

## Event schema

Required fields: `id`, `at`, `kind`, `summary`, `next`.

Kinds: `scaffold` · `approve` · `run` · `counterexample` · `converge` · `decision_link` · `note`

Optional:

- `pins` — home pins for the **ledger-host** repo (`plan` / `branch` / `commit`). Used by `ledger assert --match-pin`.
- `contexts` — named semantic pin groups (other apps, experiments, package sets).
- `active` — which context ids matter for CURRENT **Next**.

### Home pins merge

Last event that sets `pins` **replaces** prior home pins entirely. When you update commit, restate the full home set (`plan`, `branch`, `commit`) so assert keeps working.

### Contexts merge

Contexts merge **by `id`**: walk history; last definition of that id wins. `active`: last event that sets it wins; if never set, active is `[]`.

### Example (home + contexts)

```json
{
  "id": "2026-09-14T12-00-00Z-unit-1",
  "at": "2026-09-14T12:00:00.000Z",
  "kind": "note",
  "concern": "harness",
  "summary": "Unit 1 done: Playwright harness boots spa",
  "pins": {
    "plan": ".ledger/app-scan/plan.md",
    "branch": "app-scan/v1",
    "commit": "abc1234"
  },
  "contexts": [
    {
      "id": "consumer",
      "kind": "app",
      "label": "traveller-portal",
      "pins": {
        "path": "/Users/me/workspaces/dev/traveller-portal",
        "commit": "def5678"
      }
    },
    {
      "id": "local_pkgs",
      "kind": "packages",
      "pins": {
        "transcript": "file:../transcript"
      }
    }
  ],
  "active": ["consumer"],
  "artifacts": ["src/harness.ts"],
  "next": "Unit 2: shallow crawl on active consumer"
}
```

`summary` and `next` max 280 characters. Set home `pins.commit` to `git rev-parse HEAD` (ledger host) after each unit commit so `ledger assert <name> --match-pin` works. Subject-app commits live under `contexts` and are informational only.

### Switching the consumer app (same ledger)

Do **not** create a new ledger. Checkpoint an event that updates context id `consumer` (or adds a new id) and sets `active` accordingly:

```json
{
  "id": "2026-09-14T15-00-00Z-switch-consumer",
  "at": "2026-09-14T15:00:00.000Z",
  "kind": "note",
  "summary": "Point consumer at partner-portal for the next capture unit",
  "pins": {
    "plan": ".ledger/app-scan/plan.md",
    "branch": "app-scan/v1",
    "commit": "abc1234"
  },
  "contexts": [
    {
      "id": "consumer",
      "kind": "app",
      "label": "partner-portal",
      "pins": {
        "path": "/Users/me/workspaces/dev/partner-portal",
        "commit": "aaa111"
      }
    }
  ],
  "active": ["consumer"],
  "next": "User: dcd capture on partner-portal (active consumer)"
}
```

## Workflow

1. `ledger init <feat>` once per feature.
2. Edit that ledger’s `plan.md`.
3. Start a chat with `ledger prompt <feat>`.
4. Do only what **Next** says.
5. Commit the unit.
6. Propose a checkpoint → you approve (default) → `ledger checkpoint …` → commit the ledger update.
7. Repeat. Use `ledger assert <feat> --match-pin` before starting the next unit.

Plan changes: write `decisions/YYYY-MM-DD-….md`, checkpoint a `decision_link` event after you approve.

If `ledger.yaml` has `autoCheckpoint: true` and Next names an auto-checkpoint unit, the agent may checkpoint without waiting (see base prompt exception).

## Who runs what

Use this block whenever the agent needs you to do something:

```
## Ledger handoff
ledger: <feat>
kind: <checkpoint | counterexample | decision | user-run | assert | converge | prompt>
order:
  1. …
you run: <command or nothing>
agent runs: <command or nothing>
after that: …
```

| Kind | You run | Agent runs |
| --- | --- | --- |
| **checkpoint** (normal unit) | nothing | `ledger checkpoint …` after your approval |
| **user-run** (real capture / consumer) | the project command | checkpoint **after** you return output |
| **counterexample** | paste failure (or re-run if listed) | counterexample event + checkpoint |
| **decision** | approve / edit text | decision file + `decision_link` checkpoint |
| **assert** | nothing | `ledger assert … --match-pin` |
| **converge** | optional explicit accept | converge event + checkpoint |
| **prompt** | `ledger prompt` + paste | nothing |

Never ask for “run capture and checkpoint” without an `order` list.

## Handoff examples

**Checkpoint (unit done)**

```
## Ledger handoff
ledger: app-scan
kind: checkpoint
order:
  1. You approve the event below
  2. Agent runs checkpoint and commits the ledger update
you run: nothing (say "approved")
agent runs: ledger checkpoint app-scan --file .ledger/app-scan/events/<id>.json
after that: CURRENT Next advances
```

**User-run**

```
## Ledger handoff
ledger: app-scan
kind: user-run
order:
  1. Agent stops implementing
  2. You run the command
  3. You paste output
  4. Agent checkpoints run or counterexample
you run: dcd capture
agent runs: nothing until you return output
after that: Agent updates CURRENT; does not invent the next phase
```

**Counterexample**

```
## Ledger handoff
ledger: app-scan
kind: counterexample
order:
  1. You paste the failure
  2. Agent writes counterexample event + checkpoint
you run: nothing
agent runs: ledger checkpoint app-scan --file .ledger/app-scan/events/<id>.json
after that: Next names the fix or a re-run
```

## Base prompt

Stored at `.ledger/<name>/base-prompt.md`. Edit freely. `ledger prompt <name>` prints it (with Next/plan footer) and copies to the clipboard when possible.

Default template matches the app-scan style: read CURRENT, follow plan pin, assert, commit-before-next, approve checkpoints, use handoff blocks.

## Not Cursor Projects

Cursor **Projects** (sidebar) coordinates cloud agents. This tool is a file-based progress log with assert/checkpoint. Different job; they can coexist.

## Tests

```bash
npm test
```

Uses Node’s built-in test runner (`node:test`).

## License

Private / unlicensed until you publish.
