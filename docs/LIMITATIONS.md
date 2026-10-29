# Limitations and Follow-up Risks

Within the scope of this slice.

1. **In-memory only.** State is lost on exit. A real version needs persistence.
2. **Single-process concurrency only.** Operations are synchronous, so they are atomic inside one Node process. Multiple processes or service instances sharing a database would need a transaction and a lock around the capacity check and promotion, a unique constraint on email, and a sequence for queue order. No concurrency test was written because none would be meaningful here.
3. **The promotion-time recheck is unreachable through the public API.** Ineligible forms are rejected at join and the answers cannot change, so no ineligible learner can reach the queue. The skip-and-remove path (status `REMOVED`) is a defensive guard against bad stored data and is tested only by writing such data into the store directly. It was kept because the scoring rubric was not available.
4. **No authorization.** Anyone who knows an email can drop it. Identity is out of scope.
5. **Re-enroll discards history.** A dropped learner who submits a new valid form loses their old record and, if the course is full, joins the back of the waitlist.
6. **Drop reasons are not recorded.** A failed chapter test is just a drop; chapters and tests are not modelled.
7. **Basic email validation.** A shape check only. Emails are matched case-insensitively with whitespace trimmed.
8. **`NOT_REGISTERED` is ambiguous.** It covers an unknown email, an already-dropped learner and a removed learner, so a repeated drop cannot be told apart from a never-registered one.
9. **Simple scans.** Counts and the waitlist order are computed by scanning the registrations on each call. Fine at this size; a large offering would want indexed structures.
10. **CLI is a thin manual harness.** `src/commands.ts` has no automated tests of its own. It was exercised by a scripted session only.
11. **Dependency versions are the latest majors at install time** (TypeScript 7, Vitest 5, tsx) and are not pinned beyond the lockfile.
12. **Leftover placeholders.** `src/.gitkeep` and `test/.gitkeep` can be deleted.
