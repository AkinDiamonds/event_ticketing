import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "npm.cmd" : "npm";
const dockerCommand = process.platform === "win32" ? "docker.exe" : "docker";
const composeFile = "../docker-compose.test.yml";

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: process.platform === "win32",
      env: {
        ...process.env,
        TEST_DATABASE_URL:
          process.env.TEST_DATABASE_URL ??
          "postgresql://test:test@localhost:5433/event_ticketing_test",
      },
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Command terminated by ${signal}`));
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function stopDatabase() {
  return new Promise((resolve) => {
    const child = spawn(
      dockerCommand,
      ["compose", "-f", composeFile, "down", "-v", "--remove-orphans"],
      { cwd: process.cwd(), stdio: "inherit" },
    );
    child.on("error", () => resolve());
    child.on("exit", () => resolve());
  });
}

let exitCode = 1;

try {
  exitCode = await run(["run", "test:db:up"]);
  if (exitCode === 0) {
    exitCode = await run(["run", "db:migrate:test"]);
  }
  if (exitCode === 0) {
    exitCode = await run(["run", "format:check"]);
  }
  if (exitCode === 0) {
    exitCode = await run(["run", "lint"]);
  }
  if (exitCode === 0) {
    exitCode = await run(["run", "typecheck"]);
  }
  if (exitCode === 0) {
    exitCode = await run(["run", "test"]);
  }
} finally {
  await stopDatabase();
}

process.exit(exitCode);
