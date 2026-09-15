# Author a ledger implementation plan

You will write a **ledger-executable** technical plan. You will not implement code
in this turn unless the user explicitly asks after the plan is approved.

## Inputs (user must provide)

- **feat** (ledger name) — letters, numbers, hyphens, underscores
- **title** (optional) — human title; default = feat
- **branch** (optional) — home branch pin
- **project root** — directory that already has (or will get) `.ledger/`
- **problem / goal** — what the user wants built or changed
- **contexts** (optional) — consumer apps, source/dest paths, local packages

Substitute the user’s feat/title/branch everywhere below.

## Contract (mandatory)

Read and obey every section in the sibling file:

`implementation-plan.md`

(same directory as this prompt — usually `.ledger/templates/` after `ledger init`)

Contract id: `ledger-implementation-plan/v1`.

## Where to store the plan

1. If `.ledger/<feat>/` does not exist, run:
   `ledger init <feat> --title "<title>" --branch <branch>`
2. Overwrite `.ledger/<feat>/plan.md` with a filled plan that matches the
   contract section headings and unit table shape **exactly**.
3. Do not invent a second plan file. Do not put the plan in chat only.

## Writing rules

- Variable phase/unit **counts** are allowed; fixed **shape** is not.
- One unit = one what = one commit. Prefer small units.
- `runner: user` only when the human must run a real command or approve a side effect.
- `Done when` must be checkable (commands, paths, assertions) — not "looks good".
- `First Next` must name `U001` (or the first executable unit).
- Use future/conditional prose for planned behaviour (*will* / *would*).
- Full sentences in Goal / Outcomes. No telegram fragments.
- If blocked on a user decision, list it under Open questions and stop.

## After writing

1. Show the user: path to `plan.md`, unit count, first Next line, open questions.
2. Stop. Wait for approval before coding.
3. On approval, the user (or you, if asked) will checkpoint so CURRENT Next
   matches **First Next**.

## Forbidden

- Free-form roadmap prose instead of Units
- Units without `phase` / `why` / `runner` / `done when`
- Renumbering units after execution has started (append or cancel via decision)
- Creating multiple ledgers for one feat
