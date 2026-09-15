# {{title}} — implementation plan

```
contract: ledger-implementation-plan/v1
ledger: {{name}}
```

Agents will treat this file as the only execution plan for ledger `{{name}}`.
`CURRENT.md` Next will name a **unit id** from this file. Do not add free-form
phases outside the sections below.

---

## Goal

State the outcome in 2–5 full sentences. Describe what will be true when the
feature is done.

## Success

List measurable checks. Each line will be verifiable without re-reading chat.

- 
- 

## Out of scope

List work this ledger will not do. Prefer affirmative exclusions ("This plan
will leave X untouched").

- 

## Pins sketch

Optional. Sketch home pins and contexts the first checkpoint will record.
Values may be `TBD` until the first real commit.

### Home

| key | value |
| --- | --- |
| branch | {{branch}} |
| commit | TBD |
| plan | `.ledger/{{name}}/plan.md` |

### Contexts

One row per context. Omit the table if none.

| id | kind | label | pin keys (path, branch, commit, …) |
| --- | --- | --- | --- |
| | | | |

### Active

List context ids that the first units will care about, or `none`.

-

## Phases

Variable count. Each phase is a grouping label only — **ledger executes units**,
not phases. Phase ids will stay stable (`P1`, `P2`, …).

### P1 — 

**Outcome:** One sentence describing what will be true when this phase's units
are all done.

### P2 — 

**Outcome:** 

<!-- Add P3… as needed. Do not skip ids. -->

## Units

Ordered. **One unit = one what = one commit** (plus a ledger checkpoint).
Unit ids will stay stable (`U001`, `U002`, …). Do not renumber after work starts;
append new units or mark cancelled.

Every unit will use exactly this shape:

### U001 — <short what, under 80 chars>

| field | value |
| --- | --- |
| phase | P1 |
| why | <one motivation, under 140 chars> |
| runner | agent \| user |
| commit | `type(scope): description` hint under 80 chars |
| artifacts | comma-separated paths or `none` |

**Do**

1. 
2. 

**Done when**

- 
- 

<!-- Repeat ### U00N blocks. runner=user means a Ledger handoff kind: user-run. -->

## First Next

Copy-paste ready for the scaffold / first checkpoint `next` field (max 280 chars).
Name the first unit id explicitly.

```
U001 — <same short what as the unit heading>
```

## Open questions

Questions that will block a correct plan if unanswered. Empty list means the
plan is ready to execute.

- 

## Change control

Plan edits after execution starts will require:

1. a note under `.ledger/{{name}}/decisions/`
2. user approval
3. a `decision_link` checkpoint

Do not silently rewrite completed unit text; add a decision that records the
delta and any new `U0xx` units.
