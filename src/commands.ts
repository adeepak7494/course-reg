import type { RegistrationService } from "./registrationService.js";

export const HELP = [
  "Commands:",
  "  enroll <email> <highSchoolCompleted yes|no> <programmingDeclared yes|no>",
  "  drop <email>",
  "  status <email>",
  "  list",
  "  help",
  "  quit",
].join("\n");

function parseYesNo(value: string | undefined): boolean | null {
  const v = value?.toLowerCase();
  if (v === "yes" || v === "y" || v === "true") return true;
  if (v === "no" || v === "n" || v === "false") return false;
  return null;
}

/** Runs one command line against the service and returns the text to print. */
export function runCommand(service: RegistrationService, line: string): string {
  const [command, ...args] = line.trim().split(/\s+/);
  switch ((command ?? "").toLowerCase()) {
    case "":
      return "";
    case "enroll": {
      const [email, highSchool, programming] = args;
      const hs = parseYesNo(highSchool);
      const prog = parseYesNo(programming);
      if (!email || hs === null || prog === null) {
        return "usage: enroll <email> <highSchoolCompleted yes|no> <programmingDeclared yes|no>";
      }
      return JSON.stringify(service.enroll(email, hs, prog));
    }
    case "drop": {
      const [email] = args;
      if (!email) return "usage: drop <email>";
      return JSON.stringify(service.drop(email));
    }
    case "status": {
      const [email] = args;
      if (!email) return "usage: status <email>";
      return service.getStatus(email) ?? "NOT_REGISTERED";
    }
    case "list": {
      const waiting = service.waitlist().map((r) => r.email);
      return `enrolled: ${service.enrolledCount()}\nwaitlist: ${waiting.length ? waiting.join(", ") : "(empty)"}`;
    }
    case "help":
      return HELP;
    default:
      return `unknown command "${command}". Type help.`;
  }
}
