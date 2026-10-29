# AI Prompt and Use Record

Drafted by Claude from the working session; to be reviewed and corrected by the author.
Entries 1-7 were reconstructed after the fact, not logged live. From entry 8 onward, entries are added as work happens.
No credentials, secrets or personal identifiers are included.

## Summary of AI contribution (read this first)

**What the AI (Claude) did**
- Generated all the code in the first version: the service, types, tests, CLI, and the design spec, README and limitations documents.
- Proposed options and a first data model; flagged inconsistencies in the stated rules (for example, that a recheck at promotion could never fail if answers are immutable).
- Checked its own tests with a mutation check on a scratch copy (4 deliberate bugs, all caught).

**What the author decided, rejected or changed**
- Set the business rules: waitlist opens at capacity, a failed chapter test is a drop, eligibility needs both high school completed and a programming declaration, and the answers are immutable once entered.
- Changed the AI's model: `programmingDeclared` moved onto the learner; rejected the AI's seeded learner store in favour of self-declared answers; set email as the identity and idempotency key; decided re-enroll replaces old data and rejected forms are not stored.
- Questioned the AI's `REMOVED` status as unreachable; first chose to remove it, then kept it because the scoring rubric was not available. Asked whether ineligible learners should be admitted; kept the PDF-literal behaviour.
- Chose the stack (TypeScript, Vitest), the library plus CLI form, and where the project lives.

**What the author has not done**
- The author has not hand-written or hand-edited any code or documents so far. The AI wrote the files.
- The author reviewed the work by asking questions, running the CLI, and, by the author's own statement, manually testing in VS Code and examining the code. The specific checks and findings from that manual testing are not detailed here; the author may add them below.
- Five small AI design choices were never individually confirmed: no `reason` on drop, an `INVALID_REQUEST` result, an injectable store, email trimming and lowercasing, and re-enroll placing a learner at the back of a full waitlist.

**Provenance caveat**
- Entries 1-7 were written from the session transcript after the work, not logged live. Their prompts are summaries, not exact messages. Entries 8 onward were added as the work happened.

If the author makes any hand edits before submitting, they should be added below.

Legend: **Accepted** / **Edited** / **Rejected** / **Pending** (not yet confirmed by the author).

## 1. Read the assignment, scope it
- **Prompt:** "You have the context and instructions right, let's go step by step."
- **AI response (summary):** Read the assignment PDF, summarised deliverables and scope boundaries, noted no starter project was attached, and asked whether a starter exists and which stack to use.
- **Outcome:** Accepted. Author chose no starter (minimal fallback) and TypeScript.
- **Informed:** overall approach; stack.
- **Verification:** author's own answers; PDF text re-read for the fallback clause.

## 2. Policy options (ineligible learner, interface, recheck)
- **AI response (summary):** Offered options for what happens to an ineligible front-of-queue learner, how to model prerequisites, the interface form, and when to check eligibility.
- **Outcome:** Accepted in part. Author chose skip-and-remove, library plus small CLI, and check at join. Prerequisite model deferred to the author.
- **AI flag:** Checking only at join would make skip-and-remove unreachable. Author then specified recheck at admission. Accepted flag.

## 3. Author's business rules
- **Author input:** waitlist opens when capacity is reached; a failed chapter test drops the learner and promotes the next eligible one; eligibility is high school completed AND programming declaration, both required, stored for later recheck.
- **AI response (summary):** Restated the rules, proposed modelling a failed test only as a drop reason (chapters out of scope per the PDF), and asked about re-enroll, leaving the waitlist, and the source of the high-school record.
- **Outcome:** Scope note accepted (author did not object). Author chose: re-enroll allowed after drop; drop works on enrolled and waitlisted learners; learner record initially seeded.

## 4. Data model and operations proposal
- **AI response (summary):** Proposed Learner, Offering, Registration, statuses ENROLLED/WAITLISTED/DROPPED/REMOVED, result unions for enroll and drop, invariants, and a concurrency note (synchronous in-memory operations are atomic in single-threaded Node; a real database would need a transaction or lock).
- **Outcome:** Edited by author: programmingDeclared moves onto the learner; seeded learner store later **rejected** in favour of both answers being self-declared at enrollment; no update operation (answers immutable once entered).
- **Informed:** model in the design spec (to be written).

## 5. Recheck at promotion
- **AI response (summary):** Pointed out that with immutable answers the promotion recheck cannot fail through the public API; offered an updateLearner operation, a defensive recheck, or dropping the recheck.
- **Outcome:** Author did not choose an option; stated answers cannot change. AI proposed keeping the recheck as a defensive guard (tested by writing bad data into the store directly) and listing it under limitations. Author said "all good" after reviewing the record, so the guard was kept. See entry 12 for the later review of this decision.

## 6. Identity and re-enroll
- **Author input:** email is the idempotency key; re-enroll after a drop deletes the old learner data and replaces it with a new form.
- **AI response (summary):** Restated the model (Learner and Registration keyed by email, one active record per email, duplicate enroll returns existing status without overwriting). Assumed a NOT_ELIGIBLE form stores nothing.
- **Outcome:** Accepted. Author confirmed rejected forms are not stored and learners may retry.

## 7. Project skeleton
- **AI action:** Created package.json, tsconfig.json, vitest.config.ts, empty src/ and test/, installed typescript, vitest, @types/node in the connected folder.
- **Outcome:** Accepted scope (author: skeleton only; Vitest chosen by author).
- **Verification:** `npx vitest run` starts Vitest 5.0.5 and reports no test files; `npx tsc --noEmit` reports no inputs. Both expected with no code. Run in the AI sandbox (Node 22); author to re-run locally.
- **Open:** dependencies resolved to latest majors (TypeScript 7, Vitest 5); version pinning not decided.

## 8. This record
- **Prompt:** author asked whether AI interaction was being recorded per the PDF.
- **AI response:** Said it had not been, then created this file from the session.
- **Outcome:** Accepted; author reviewed the record and said "all good".

## 9. Service implementation
- **Prompt:** "okay all good let's start building the service slice."
- **AI output:** `src/types.ts`, `src/registrationService.ts`: in-memory store injected via constructor, enroll/drop, FIFO promotion with skip-and-remove recheck.
- **AI choices flagged to the author, not yet explicitly confirmed:** no `reason` parameter on drop (nothing stores it); added `INVALID_REQUEST` result for bad email or non-boolean answers; injectable store so tests can plant bad data; emails normalised by trim and lowercase; a rejected re-enroll leaves any earlier dropped record untouched.
- **Verification:** `npx tsc --noEmit` clean.

## 10. Tests
- **AI output:** `test/registrationService.test.ts`, 25 tests covering available capacity, full capacity, duplicates, FIFO promotion, prerequisite failure, invalid and repeated drops, re-enroll, the defensive recheck, and a capacity invariant sequence.
- **Verification:** `npx vitest run`: 25 passed. Mutation check on a scratch copy (not the project): capacity off-by-one (10 tests failed), reversed FIFO order (5 failed), skip without removing (2 failed), repeated drop allowed to promote (1 failed). All caught; project source unchanged.
- **Not covered:** concurrency test (operations are synchronous; see design spec to be written). CLI not yet built.

## 11. Design specification
- **Prompt:** "design spec first."
- **AI output:** `docs/DESIGN-SPEC.md`, written from the implemented code and the decisions in entries 1-6.
- **Informed by:** the author's rules (entries 3, 6), the implementation (entry 9), and the tests (entry 10).
- **Verification:** the AI cross-checked the spec's result names, statuses and invariants against the code and tests.
- **Outcome:** Accepted. Author reviewed and said "everything looks good"; no edits requested. Entry 12 and the later clarifications did not change the spec.

## 12. Review of REMOVED status and promotion recheck
- **Author prompt:** questioned why the REMOVED status exists when no operation can change stored answers.
- **AI response (summary):** Agreed it is unreachable through the public API and was the AI's own suggestion (entry 4). Set out the cost of keeping it (one status, a short skip loop, three tests that plant bad data, a spec section) against removing it (plain FIFO; the spec would say ineligible learners are rejected at join and never queued).
- **Author decision:** first chose to remove it, then reversed: "I don't have the rubric, let's play safe." Kept as a defensive guard so the assignment's "ineligible learner at the front of the queue" case has a stated, tested policy.
- **Outcome:** AI suggestion kept after author review; no code changed. Rationale: unknown scoring rubric, not a functional need.

## 13. CLI
- **Prompt:** "I think time to test with cli."
- **AI output:** `src/commands.ts` (command parsing, calls the service, no business logic), `src/cli.ts` (interactive prompt, capacity as the first argument), `tsx` dev dependency, `npm run cli` script.
- **AI choices, pending author review:** interactive prompt rather than one-shot commands, because state is in memory; capacity has no default; yes/no accepts yes/y/true and no/n/false.
- **Outcome:** Accepted. Author tried the CLI and said "everything works"; no edits requested.
- **Verification:** `npx tsc --noEmit` clean. Scripted session piped into `npm run cli -- 2` in the AI sandbox: enroll to capacity, waitlist in join order, duplicate enroll, ineligible form, drop promoting the earliest waitlisted learner, repeated and unknown drops, invalid email and answers, unknown command. All outputs matched expectations. `commands.ts` has no automated tests yet.

## 14. Wrap-up: README, limitations, final verification
- **Prompt:** "okay all good everything works let wrap it up."
- **AI output:** `README.md` (setup, test and CLI commands), `docs/LIMITATIONS.md`.
- **Author clarifications during review (no code change):** confirmed that `drop <email>` acts on the named learner and FIFO governs only who is promoted; the PDF was re-read and no conflicting rule was found. Author asked whether ineligible learners should be admitted; kept the PDF-literal behaviour (reject at join).
- **Verification:** final run from a clean copy of the project: `vitest run` 25 passed; `tsc --noEmit` clean. An in-place `npm test` in the AI sandbox failed with EPERM because the sandbox cannot delete Vitest's cache inside the connected folder; this is a sandbox restriction, not a test failure.
- **Caveat:** `node_modules` in the project was installed by the AI sandbox (Linux). Reinstall on the author's machine before submitting; the README says so.
- **Authorship note for reviewers:** the AI generated the first version of the service, tests, CLI and documents; the author made the business rules and design decisions, challenged the REMOVED status and ineligible-learner handling, and reviewed. The author should add any edits made by hand to this record.

## 15. Author's own review
- **Author statement:** manually tested in VS Code and examined the code.
- **Recorded as stated:** no details of what was run or any findings were given to the AI, so none are recorded. No code or document changes resulted from it.
- **Author's run on their own machine (Windows, from the terminal output the author shared):**
  - `npm run cli -- 3`: an ineligible form was rejected, then accepted on a corrected form (`y y` accepted as yes); a repeat enroll for an enrolled learner returned `ALREADY_REGISTERED` and kept the stored answers; with the course full, three learners were waitlisted at positions 1 to 3; dropping an enrolled learner promoted the earliest waitlisted learner and `list` showed 3 enrolled with the remaining two waiting in order; bare `enroll` and `drop` printed usage messages. Results matched the documented rules.
  - `npm test`: 25 passed (Vitest 5.0.5), confirming the tests also pass outside the AI sandbox.
- **Author to add:** anything changed by hand, and any further manual checks.
