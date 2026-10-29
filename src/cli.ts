import * as readline from "node:readline";
import { HELP, runCommand } from "./commands.js";
import { RegistrationService } from "./registrationService.js";

const capacity = Number(process.argv[2]);
if (!Number.isInteger(capacity) || capacity < 1) {
  console.error("usage: npm run cli -- <capacity>   (capacity: a positive whole number)");
  process.exit(1);
}

const service = new RegistrationService(capacity);
console.log(`Course offering with ${capacity} seat(s). State is in memory only.\n${HELP}`);

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  if (line.trim().toLowerCase() === "quit") break;
  const output = runCommand(service, line);
  if (output) console.log(output);
}
