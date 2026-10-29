# Design Specification: Course Enrollment, Drop and Waitlist Promotion

Scope: one course offering, in-memory, TypeScript. No starter project was supplied, so this is the minimal service fallback allowed by the assignment. No frontend, catalog, payments, identity, multi-term support, deployment or database.

## 1. Service boundary

`RegistrationService` (`src/registrationService.ts`) manages one offering with a fixed capacity given at construction. It exposes two mutating operations and three read helpers. A small CLI over the same class is planned but not yet built.

| Operation | Purpose |
|---|---|
| `enroll(email, highSchoolCompleted, programmingDeclared)` | Submit the enrollment form |
| `drop(email)` | Leave the course or the waitlist (a failed chapter test is just a drop) |
| `getStatus(email)`, `enrolledCount()`, `waitlist()` | Read state |

Chapters and tests are out of scope; the service only receives the resulting drop.

## 2. Data model

```
Learner      { email, highSchoolCompleted, programmingDeclared }
Registration { email, status, queueOrder? }
status       ENROLLED | WAITLISTED | DROPPED | REMOVED
Store        { learners: Map<email, Learner>, registrations: Map<email, Registration> }
```

- Email (trimmed, lowercased) is the identity and the idempotency key.
- The two declarations are self-declared yes/no answers entered on the enrollment form and stored on the learner. No operation changes them.
- `queueOrder` comes from a counter that only increases and is set only while WAITLISTED.
- `DROPPED` means the learner left. `REMOVED` means the system removed a waitlisted learner who failed the recheck at promotion.
- The store can be injected through the constructor; tests use this to plant bad data.

## 3. Operations and results

**enroll**

| Result | When |
|---|---|
| `INVALID_REQUEST` | email malformed, or an answer is not a boolean |
| `ALREADY_REGISTERED` (with status) | the email is ENROLLED or WAITLISTED; nothing is changed or overwritten |
| `NOT_ELIGIBLE` (with reasons) | either answer is no; nothing is stored |
| `ENROLLED` | eligible and enrolled count is below capacity |
| `WAITLISTED` (with position) | eligible and the course is full |

**drop**

| Result | When |
|---|---|
| `INVALID_REQUEST` | email malformed |
| `NOT_REGISTERED` | no record, or the record is already DROPPED or REMOVED (covers repeated drops) |
| `REMOVED_FROM_WAITLIST` | learner was WAITLISTED; no seat opens |
| `DROPPED` (with `promoted`, `removed`) | learner was ENROLLED; a seat opens and promotion runs |

Re-enrolling after DROPPED or REMOVED is treated as a new form: a valid, eligible submission replaces the old learner and registration data, and the learner joins as a fresh registration (enrolled, or at the back of the waitlist). A rejected submission leaves the earlier record untouched.

## 4. Invariants

1. Enrolled count never exceeds capacity.
2. At most one learner record and one registration per email.
3. The waitlist is ordered by `queueOrder`, which reflects join time and is never reused.
4. After any operation completes, a non-empty waitlist implies the course is full.
5. Only eligible forms are stored; ineligible submissions leave no trace.

## 5. Eligibility and promotion rule

Eligible means `highSchoolCompleted` is yes and `programmingDeclared` is yes. Both are required.

Eligibility is checked at join. When an enrolled learner drops, the earliest waitlisted learner is rechecked:
- if eligible, they become ENROLLED and promotion stops;
- if not eligible, they are skipped and set to REMOVED (they do not stay in the queue), and the next learner is tried;
- if the queue runs out, the seat stays open.

Exactly one seat opens per drop, so at most one learner is promoted per drop.

Because the answers cannot change, the promotion recheck cannot fail through the public API. It exists as a defensive guard against bad or corrupted stored data and is tested by writing such data into the store directly.

## 6. Concurrency and persistence

The store is in memory and not persistent. Every operation is synchronous with no `await` between reading and writing state, so within one Node process each call runs to completion before another starts. This keeps the invariants without locks, and a concurrency test would not be meaningful here.

This guarantee holds only for a single process and a single service instance. A database-backed version would need a transaction per operation, a lock on the offering row (or equivalent) around the capacity check and promotion, a unique constraint on email, and a sequence for queue order.

## 7. Assumptions and tradeoffs

- One offering, fixed capacity, set at construction and validated as a positive integer.
- Rejected forms are not stored, so learners may simply try again.
- A duplicate enroll for an active registration returns the existing status and ignores the new answers.
- A re-enrolling learner loses their old queue position and history; the old data is deleted by design.
- `drop` takes no reason, since nothing would store it.
- Email validation is a basic shape check, not deliverability.
- No authorization: anyone who knows an email can drop it. Identity is out of scope.
- Simple scans over the registrations map are used for counts and the waitlist. That is fine at this size and keeps the code easy to review.

## 8. Tests

`test/registrationService.test.ts` (Vitest) covers available and full capacity, duplicates, invalid input, prerequisite failures, FIFO promotion, waitlist removal, invalid and repeated drops, re-enroll, the promotion recheck, and a capacity invariant over a mixed sequence.
