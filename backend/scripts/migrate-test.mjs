import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

if (!existsSync("drizzle/meta/_journal.json")) {
  console.log("No committed migrations yet; skipping migration step.");
  process.exit(0);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["drizzle-kit", "migrate"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL:
      process.env.TEST_DATABASE_URL ??
      "postgresql://test:test@localhost:5433/event_ticketing_test",
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }
  process.exit(code ?? 1);
});
