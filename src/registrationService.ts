import type {
  DropResult,
  EnrollResult,
  IneligibleReason,
  Learner,
  Registration,
  RegistrationStatus,
  Store,
} from "./types.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function ineligibleReasons(learner: Learner): IneligibleReason[] {
  const reasons: IneligibleReason[] = [];
  if (!learner.highSchoolCompleted) reasons.push("HIGH_SCHOOL_NOT_COMPLETED");
  if (!learner.programmingDeclared) reasons.push("NO_PROGRAMMING_DECLARATION");
  return reasons;
}

/**
 * Enrollment, drop and FIFO waitlist promotion for a single course offering.
 * All operations are synchronous, so each runs to completion without
 * interleaving (see the design spec for the concurrency note).
 */
export class RegistrationService {
  private nextQueueOrder = 1;

  constructor(
    private readonly capacity: number,
    private readonly store: Store = { learners: new Map(), registrations: new Map() },
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("capacity must be a positive integer");
    }
  }

  enroll(email: string, highSchoolCompleted: boolean, programmingDeclared: boolean): EnrollResult {
    const key = normalizeEmail(email);
    if (key === null) return { outcome: "INVALID_REQUEST", message: "a valid email is required" };
    if (typeof highSchoolCompleted !== "boolean" || typeof programmingDeclared !== "boolean") {
      return { outcome: "INVALID_REQUEST", message: "both declarations must be yes/no values" };
    }

    const existing = this.store.registrations.get(key);
    if (existing && (existing.status === "ENROLLED" || existing.status === "WAITLISTED")) {
      return { outcome: "ALREADY_REGISTERED", status: existing.status };
    }

    const learner: Learner = { email: key, highSchoolCompleted, programmingDeclared };
    const reasons = ineligibleReasons(learner);
    if (reasons.length > 0) return { outcome: "NOT_ELIGIBLE", reasons };

    // A new valid form replaces any earlier dropped/removed data for this email.
    this.store.learners.set(key, learner);

    if (this.enrolledCount() < this.capacity) {
      this.store.registrations.set(key, { email: key, status: "ENROLLED" });
      return { outcome: "ENROLLED" };
    }

    const queueOrder = this.nextQueueOrder++;
    this.store.registrations.set(key, { email: key, status: "WAITLISTED", queueOrder });
    return { outcome: "WAITLISTED", position: this.waitlist().length };
  }

  drop(email: string): DropResult {
    const key = normalizeEmail(email);
    if (key === null) return { outcome: "INVALID_REQUEST", message: "a valid email is required" };

    const registration = this.store.registrations.get(key);
    if (!registration) return { outcome: "NOT_REGISTERED" };

    if (registration.status === "WAITLISTED") {
      this.store.registrations.set(key, { email: key, status: "DROPPED" });
      return { outcome: "REMOVED_FROM_WAITLIST" };
    }
    if (registration.status !== "ENROLLED") return { outcome: "NOT_REGISTERED" };

    this.store.registrations.set(key, { email: key, status: "DROPPED" });
    return { outcome: "DROPPED", ...this.promoteNext() };
  }

  /** Promote the earliest eligible waitlisted learner; skip and remove ineligible ones. */
  private promoteNext(): { promoted: string | null; removed: string[] } {
    const removed: string[] = [];
    for (const entry of this.waitlist()) {
      const learner = this.store.learners.get(entry.email);
      if (learner && ineligibleReasons(learner).length === 0) {
        this.store.registrations.set(entry.email, { email: entry.email, status: "ENROLLED" });
        return { promoted: entry.email, removed };
      }
      this.store.registrations.set(entry.email, { email: entry.email, status: "REMOVED" });
      removed.push(entry.email);
    }
    return { promoted: null, removed };
  }

  getStatus(email: string): RegistrationStatus | null {
    const key = normalizeEmail(email);
    return key === null ? null : (this.store.registrations.get(key)?.status ?? null);
  }

  enrolledCount(): number {
    let count = 0;
    for (const r of this.store.registrations.values()) if (r.status === "ENROLLED") count++;
    return count;
  }

  /** Waitlisted registrations in FIFO order. */
  waitlist(): Registration[] {
    return [...this.store.registrations.values()]
      .filter((r) => r.status === "WAITLISTED")
      .sort((a, b) => (a.queueOrder ?? 0) - (b.queueOrder ?? 0));
  }
}
