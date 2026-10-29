export type RegistrationStatus = "ENROLLED" | "WAITLISTED" | "DROPPED" | "REMOVED";
export type ActiveStatus = "ENROLLED" | "WAITLISTED";

export interface Learner {
  email: string;
  highSchoolCompleted: boolean;
  programmingDeclared: boolean;
}

export interface Registration {
  email: string;
  status: RegistrationStatus;
  /** Join order on the waitlist; only set while WAITLISTED. */
  queueOrder?: number;
}

export interface Store {
  learners: Map<string, Learner>;
  registrations: Map<string, Registration>;
}

export type IneligibleReason = "HIGH_SCHOOL_NOT_COMPLETED" | "NO_PROGRAMMING_DECLARATION";

export type EnrollResult =
  | { outcome: "ENROLLED" }
  | { outcome: "WAITLISTED"; position: number }
  | { outcome: "ALREADY_REGISTERED"; status: ActiveStatus }
  | { outcome: "NOT_ELIGIBLE"; reasons: IneligibleReason[] }
  | { outcome: "INVALID_REQUEST"; message: string };

export type DropResult =
  | {
      outcome: "DROPPED";
      /** Learner promoted into the freed seat, if any. */
      promoted: string | null;
      /** Ineligible waitlisted learners skipped and removed during promotion. */
      removed: string[];
    }
  | { outcome: "REMOVED_FROM_WAITLIST" }
  | { outcome: "NOT_REGISTERED" }
  | { outcome: "INVALID_REQUEST"; message: string };
