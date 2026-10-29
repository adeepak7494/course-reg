# Course Registration: Enrollment, Drop and FIFO Waitlist

A bounded service slice for one course offering: enroll, drop, and FIFO waitlist promotion. In-memory TypeScript with a small interactive CLI. No starter project was supplied, so this uses the assignment's minimal service fallback.

## Requirements
- Node.js 22 or newer
- npm

## Setup
```
npm install
```
If `node_modules` already exists from an earlier install on a different operating system, delete it first and reinstall. Some dependencies contain OS-specific binaries.

## Run the tests
```
npm test
```
Type check:
```
npm run typecheck
```

## Try the CLI
```
npm run cli -- 2
```
The number is the course capacity (a positive whole number). State is in memory and is lost when you quit.

| Command | Meaning |
|---|---|
| `enroll <email> <highSchoolCompleted yes\|no> <programmingDeclared yes\|no>` | Submit the enrollment form |
| `drop <email>` | Drop that learner (from the course or the waitlist) |
| `status <email>` | Show a learner's status |
| `list` | Enrolled count and the waitlist in order |
| `help`, `quit` | |

Example: with capacity 2, enroll `a`, `b`, `c`, `d` (all `yes yes`). `a` and `b` are enrolled; `c` and `d` are waitlisted. `drop a@x.com` promotes `c@x.com`.

## Documents
- `docs/DESIGN-SPEC.md`: service boundary, data model, invariants, promotion rule, concurrency approach, assumptions.
- `docs/AI-USE-RECORD.md`: prompts, AI responses, accepted/edited/rejected decisions, verification evidence.
- `docs/LIMITATIONS.md`: limitations and follow-up risks.

## Layout
- `src/registrationService.ts`: the feature.
- `src/types.ts`: types and result unions.
- `src/commands.ts`, `src/cli.ts`: CLI.
- `test/registrationService.test.ts`: automated tests.
