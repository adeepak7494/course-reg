import { describe, expect, it } from "vitest";
import { RegistrationService } from "../src/registrationService.js";
import type { Store } from "../src/types.js";

const emptyStore = (): Store => ({ learners: new Map(), registrations: new Map() });

/** Service with capacity 2, already full with a@x.com and b@x.com. */
function fullService(store: Store = emptyStore()) {
  const service = new RegistrationService(2, store);
  service.enroll("a@x.com", true, true);
  service.enroll("b@x.com", true, true);
  return service;
}

describe("capacity", () => {
  it("rejects an invalid capacity", () => {
    expect(() => new RegistrationService(0)).toThrow(RangeError);
    expect(() => new RegistrationService(1.5)).toThrow(RangeError);
  });

  it("enrolls while seats remain", () => {
    const service = new RegistrationService(2);
    expect(service.enroll("a@x.com", true, true)).toEqual({ outcome: "ENROLLED" });
    expect(service.enroll("b@x.com", true, true)).toEqual({ outcome: "ENROLLED" });
    expect(service.enrolledCount()).toBe(2);
  });

  it("waitlists eligible learners once the course is full", () => {
    const service = fullService();
    expect(service.enroll("c@x.com", true, true)).toEqual({ outcome: "WAITLISTED", position: 1 });
    expect(service.enroll("d@x.com", true, true)).toEqual({ outcome: "WAITLISTED", position: 2 });
    expect(service.enrolledCount()).toBe(2);
    expect(service.waitlist().map((r) => r.email)).toEqual(["c@x.com", "d@x.com"]);
  });
});

describe("duplicate and invalid enroll requests", () => {
  it("does not duplicate an enrolled learner", () => {
    const service = new RegistrationService(2);
    service.enroll("a@x.com", true, true);
    expect(service.enroll("a@x.com", true, true)).toEqual({
      outcome: "ALREADY_REGISTERED",
      status: "ENROLLED",
    });
    expect(service.enrolledCount()).toBe(1);
  });

  it("does not duplicate a waitlisted learner or change their position", () => {
    const service = fullService();
    service.enroll("c@x.com", true, true);
    service.enroll("d@x.com", true, true);
    expect(service.enroll("c@x.com", true, true)).toEqual({
      outcome: "ALREADY_REGISTERED",
      status: "WAITLISTED",
    });
    expect(service.waitlist().map((r) => r.email)).toEqual(["c@x.com", "d@x.com"]);
  });

  it("treats email case and whitespace as the same learner", () => {
    const service = new RegistrationService(2);
    service.enroll("a@x.com", true, true);
    expect(service.enroll("  A@X.com ", true, true).outcome).toBe("ALREADY_REGISTERED");
    expect(service.enrolledCount()).toBe(1);
  });

  it("ignores changed answers on a duplicate request for an active registration", () => {
    const store = emptyStore();
    const service = new RegistrationService(2, store);
    service.enroll("a@x.com", true, true);
    service.enroll("a@x.com", false, false);
    expect(store.learners.get("a@x.com")).toEqual({
      email: "a@x.com",
      highSchoolCompleted: true,
      programmingDeclared: true,
    });
  });

  it("returns INVALID_REQUEST for a bad email or non-boolean answers", () => {
    const service = new RegistrationService(2);
    expect(service.enroll("not-an-email", true, true).outcome).toBe("INVALID_REQUEST");
    expect(service.enroll("", true, true).outcome).toBe("INVALID_REQUEST");
    expect(service.enroll("a@x.com", "yes" as unknown as boolean, true).outcome).toBe(
      "INVALID_REQUEST",
    );
    expect(service.enrolledCount()).toBe(0);
    expect(service.getStatus("a@x.com")).toBeNull();
  });
});

describe("prerequisites", () => {
  it("rejects without high school completed and stores nothing", () => {
    const store = emptyStore();
    const service = new RegistrationService(2, store);
    expect(service.enroll("a@x.com", false, true)).toEqual({
      outcome: "NOT_ELIGIBLE",
      reasons: ["HIGH_SCHOOL_NOT_COMPLETED"],
    });
    expect(store.learners.size).toBe(0);
    expect(store.registrations.size).toBe(0);
  });

  it("rejects without a programming declaration", () => {
    const service = new RegistrationService(2);
    expect(service.enroll("a@x.com", true, false)).toEqual({
      outcome: "NOT_ELIGIBLE",
      reasons: ["NO_PROGRAMMING_DECLARATION"],
    });
  });

  it("reports both failures when both answers are no", () => {
    const service = new RegistrationService(2);
    expect(service.enroll("a@x.com", false, false)).toEqual({
      outcome: "NOT_ELIGIBLE",
      reasons: ["HIGH_SCHOOL_NOT_COMPLETED", "NO_PROGRAMMING_DECLARATION"],
    });
  });

  it("does not waitlist an ineligible learner when the course is full", () => {
    const service = fullService();
    expect(service.enroll("c@x.com", false, true).outcome).toBe("NOT_ELIGIBLE");
    expect(service.waitlist()).toHaveLength(0);
  });

  it("lets a learner retry with a new eligible form after rejection", () => {
    const service = new RegistrationService(2);
    service.enroll("a@x.com", false, true);
    expect(service.enroll("a@x.com", true, true)).toEqual({ outcome: "ENROLLED" });
  });
});

describe("drop and FIFO promotion", () => {
  it("promotes the earliest waitlisted learner when an enrolled learner drops", () => {
    const service = fullService();
    service.enroll("c@x.com", true, true);
    service.enroll("d@x.com", true, true);

    expect(service.drop("a@x.com")).toEqual({ outcome: "DROPPED", promoted: "c@x.com", removed: [] });
    expect(service.getStatus("a@x.com")).toBe("DROPPED");
    expect(service.getStatus("c@x.com")).toBe("ENROLLED");
    expect(service.getStatus("d@x.com")).toBe("WAITLISTED");
    expect(service.enrolledCount()).toBe(2);

    expect(service.drop("b@x.com")).toEqual({ outcome: "DROPPED", promoted: "d@x.com", removed: [] });
    expect(service.waitlist()).toHaveLength(0);
  });

  it("opens a seat with no promotion when the waitlist is empty", () => {
    const service = new RegistrationService(2);
    service.enroll("a@x.com", true, true);
    expect(service.drop("a@x.com")).toEqual({ outcome: "DROPPED", promoted: null, removed: [] });
    expect(service.enrolledCount()).toBe(0);
    expect(service.enroll("b@x.com", true, true)).toEqual({ outcome: "ENROLLED" });
  });

  it("removes a waitlisted learner without opening a seat", () => {
    const service = fullService();
    service.enroll("c@x.com", true, true);
    service.enroll("d@x.com", true, true);
    expect(service.drop("c@x.com")).toEqual({ outcome: "REMOVED_FROM_WAITLIST" });
    expect(service.enrolledCount()).toBe(2);
    expect(service.waitlist().map((r) => r.email)).toEqual(["d@x.com"]);
  });

  it("returns NOT_REGISTERED for unknown learners and repeated drops without changing state", () => {
    const service = fullService();
    service.enroll("c@x.com", true, true);

    expect(service.drop("nobody@x.com")).toEqual({ outcome: "NOT_REGISTERED" });

    service.drop("a@x.com"); // c@x.com is promoted
    expect(service.drop("a@x.com")).toEqual({ outcome: "NOT_REGISTERED" });
    expect(service.enrolledCount()).toBe(2);
    expect(service.getStatus("c@x.com")).toBe("ENROLLED");
    expect(service.waitlist()).toHaveLength(0);
  });

  it("returns INVALID_REQUEST for a bad email", () => {
    const service = fullService();
    expect(service.drop("bad").outcome).toBe("INVALID_REQUEST");
    expect(service.enrolledCount()).toBe(2);
  });

  it("keeps FIFO order by join time, not by email", () => {
    const service = new RegistrationService(1);
    service.enroll("a@x.com", true, true);
    service.enroll("z@x.com", true, true);
    service.enroll("m@x.com", true, true);
    expect(service.drop("a@x.com")).toMatchObject({ promoted: "z@x.com" });
  });

  it("lets a dropped learner enroll again with a new form", () => {
    const store = emptyStore();
    const service = new RegistrationService(1, store);
    service.enroll("a@x.com", true, true);
    service.drop("a@x.com");
    expect(service.getStatus("a@x.com")).toBe("DROPPED");
    expect(service.enroll("a@x.com", true, true)).toEqual({ outcome: "ENROLLED" });
    expect(service.getStatus("a@x.com")).toBe("ENROLLED");
  });

  it("puts a re-enrolling learner at the back of a full course's waitlist", () => {
    const service = new RegistrationService(1);
    service.enroll("a@x.com", true, true);
    service.enroll("b@x.com", true, true);
    service.drop("a@x.com"); // b promoted
    expect(service.enroll("a@x.com", true, true)).toEqual({ outcome: "WAITLISTED", position: 1 });
  });
});

describe("promotion-time recheck (defensive guard)", () => {
  // No public operation changes stored answers, so these tests plant bad data directly.
  it("skips and removes an ineligible front learner, then promotes the next", () => {
    const store = emptyStore();
    const service = fullService(store);
    service.enroll("c@x.com", true, true);
    service.enroll("d@x.com", true, true);
    store.learners.set("c@x.com", { email: "c@x.com", highSchoolCompleted: false, programmingDeclared: true });

    expect(service.drop("a@x.com")).toEqual({
      outcome: "DROPPED",
      promoted: "d@x.com",
      removed: ["c@x.com"],
    });
    expect(service.getStatus("c@x.com")).toBe("REMOVED");
    expect(service.getStatus("d@x.com")).toBe("ENROLLED");
    expect(service.waitlist()).toHaveLength(0);
  });

  it("leaves the seat open if every waitlisted learner is ineligible", () => {
    const store = emptyStore();
    const service = fullService(store);
    service.enroll("c@x.com", true, true);
    store.learners.delete("c@x.com");

    expect(service.drop("a@x.com")).toEqual({ outcome: "DROPPED", promoted: null, removed: ["c@x.com"] });
    expect(service.enrolledCount()).toBe(1);
    expect(service.enroll("e@x.com", true, true)).toEqual({ outcome: "ENROLLED" });
  });

  it("does not let a removed learner be promoted by a later drop", () => {
    const store = emptyStore();
    const service = fullService(store);
    service.enroll("c@x.com", true, true);
    store.learners.set("c@x.com", { email: "c@x.com", highSchoolCompleted: true, programmingDeclared: false });
    service.drop("a@x.com");
    expect(service.drop("b@x.com")).toEqual({ outcome: "DROPPED", promoted: null, removed: [] });
    expect(service.getStatus("c@x.com")).toBe("REMOVED");
  });
});

describe("invariants", () => {
  it("never exceeds capacity across a mixed sequence", () => {
    const service = new RegistrationService(3);
    const emails = Array.from({ length: 8 }, (_, i) => `u${i}@x.com`);
    for (const e of emails) {
      service.enroll(e, true, true);
      expect(service.enrolledCount()).toBeLessThanOrEqual(3);
    }
    for (const e of emails.slice(0, 5)) {
      service.drop(e);
      expect(service.enrolledCount()).toBeLessThanOrEqual(3);
    }
    expect(service.enrolledCount()).toBe(3);
    expect(service.waitlist()).toHaveLength(0);
  });
});
